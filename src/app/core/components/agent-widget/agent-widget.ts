// src/app/core/components/agent-widget/agent-widget.ts
// Widget flottant de l'assistant MIAV : texte + voix (entrée et sortie),
// historique des conversations et indicateur d'état.

import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { Agent } from '../../services/Agent/agent';
import { Auth } from '../../services/Auth/auth';
import { Notification } from '../../services/Notification/notification';
import {
  AgentChatRequest,
  AgentConversation,
  AgentInputMode,
  AgentMessage,
  AgentState
} from '../../models/Agent/agent.models';

// ── API Web Speech (non typée dans lib.dom) ─────────────────────────────
interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

@Component({
  selector: 'app-agent-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agent-widget.html',
  styleUrl: './agent-widget.scss',
})
export class AgentWidget implements OnInit, OnDestroy {

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') private messageInput?: ElementRef<HTMLTextAreaElement>;

  /** Panneau ouvert / fermé. */
  isOpen = false;

  /** État visible : en ligne, écoute, réflexion ou parole. */
  agentState: AgentState = 'idle';

  /** Messages affichés (accueil local inclus). */
  messages: AgentMessage[] = [];

  /** Contenu de la zone de saisie. */
  inputText = '';
  readonly maxLength = 2000;

  /** Sortie vocale activée (persistée). */
  soundEnabled = true;

  /** Le navigateur expose-t-il la reconnaissance vocale ? */
  speechSupported = false;

  isListening = false;
  isLoadingConversation = false;
  isSending = false;

  /** Message discret affiché sous les messages (erreurs micro). */
  voiceNotice: string | null = null;

  /** Prénom de l'utilisateur pour le message d'accueil. */
  userFirstName = '';

  /** Suggestions proposées tant qu'aucun échange réel n'a eu lieu. */
  readonly suggestions: string[] = [
    'Que peux-tu faire ?',
    'Résumé des offrandes du mois',
    'Combien de membres actifs ?',
    'Quels sont les prochains événements ?'
  ];

  private conversationId: string | null = null;
  private conversations: AgentConversation[] = [];
  private historyLoaded = false;
  private lastInputMode: AgentInputMode = 'text';

  private readonly subscriptions = new Subscription();
  private recognition: SpeechRecognitionLike | null = null;
  private interimBase = '';
  private voiceNoticeTimer: ReturnType<typeof setTimeout> | null = null;
  private autoOpenTimer: ReturnType<typeof setTimeout> | null = null;

  /** Préchargement de l'historique dès l'arrivée sur le dashboard (évite l'attente au 1er clic). */
  private prefetchTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly isBrowser: boolean;
  private readonly soundStorageKey = 'ekklesia_agent_sound';
  private readonly seenStorageKey = 'ekklesia_agent_seen';

  constructor(
    private agentApi: Agent,
    private authService: Auth,
    private notification: Notification,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.soundEnabled = this.readSoundPreference();
    this.speechSupported = this.getSpeechRecognitionCtor() !== null;
    this.loadCurrentUserName();
    this.maybeAutoOpen();
    this.prefetchHistorySoon();
  }

  ngOnDestroy(): void {
    this.stopListening();
    this.stopSpeaking();
    if (this.voiceNoticeTimer) clearTimeout(this.voiceNoticeTimer);
    if (this.autoOpenTimer) clearTimeout(this.autoOpenTimer);
    if (this.prefetchTimer) clearTimeout(this.prefetchTimer);
    this.subscriptions.unsubscribe();
  }

  // ────────────────────────────────────────────────────────────────────
  // PANNEAU
  // ────────────────────────────────────────────────────────────────────

  togglePanel(): void {
    if (this.isOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  openPanel(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.focusInputSoon();

    // Ouverture perçue comme instantanée : l'accueil local s'affiche tout de suite,
    // l'historique éventuel le remplacera discrètement une fois chargé.
    if (this.messages.length === 0) {
      this.showWelcome();
    }

    if (!this.historyLoaded) {
      this.loadHistory(true);
    }
  }

  closePanel(): void {
    this.stopListening();
    this.stopSpeaking();
    this.isOpen = false;
  }

  /** Ferme le panneau avec Échap (accessibilité clavier). */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.closePanel();
    }
  }

  /** Première visite : ouverture automatique, sans lecture audio. */
  private maybeAutoOpen(): void {
    let alreadySeen = true;
    try {
      alreadySeen = localStorage.getItem(this.seenStorageKey) === '1';
    } catch {
      alreadySeen = true;
    }

    if (alreadySeen) return;

    try {
      localStorage.setItem(this.seenStorageKey, '1');
    } catch {
      // Stockage indisponible : l'ouverture unique reste sans conséquence.
    }

    this.autoOpenTimer = setTimeout(() => {
      this.autoOpenTimer = null;
      this.openPanel();
    }, 600);
  }

  // ────────────────────────────────────────────────────────────────────
  // HISTORIQUE
  // ────────────────────────────────────────────────────────────────────

  /**
   * Précharge l'historique pendant que l'utilisateur consulte la page.
   * Objectif : quand il clique, la conversation est déjà là — et si le backend
   * est en veille (cold start), l'attente se fait en arrière-plan, pas au clic.
   */
  private prefetchHistorySoon(): void {
    if (this.historyLoaded) return;

    this.prefetchTimer = setTimeout(() => {
      this.prefetchTimer = null;
      if (!this.historyLoaded) {
        this.loadHistory(true);
      }
    }, 1200);
  }

  private loadHistory(silent = false): void {
    this.historyLoaded = true;
    if (!silent) {
      this.isLoadingConversation = true;
    }

    this.subscriptions.add(
      this.agentApi.getConversations().subscribe({
        next: (response) => {
          this.isLoadingConversation = false;

          if (!response.success || !response.data || response.data.length === 0) {
            this.showWelcome();
            return;
          }

          // L'utilisateur a déjà écrit ou envoyé : ne jamais écraser sa conversation.
          if (this.hasUserActivity()) {
            return;
          }

          this.conversations = [...response.data].sort(
            (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
          );
          this.loadConversation(this.conversations[0].id, silent);
        },
        error: () => {
          this.isLoadingConversation = false;
          // Backend en veille ou réseau : on autorise une nouvelle tentative au prochain clic.
          this.historyLoaded = false;
          this.showWelcome();
        }
      })
    );
  }

  /** Vrai dès que l'utilisateur a un message réel (en cours d'envoi ou affiché). */
  private hasUserActivity(): boolean {
    return this.isSending || this.messages.some(m => !m.isLocal && m.role === 'user');
  }

  private loadConversation(id: string, silent = false): void {
    if (!silent) {
      this.isLoadingConversation = true;
    }

    this.subscriptions.add(
      this.agentApi.getConversation(id).subscribe({
        next: (response) => {
          this.isLoadingConversation = false;

          if (response.success && response.data) {
            // Ne pas écraser la conversation si l'utilisateur a commencé à écrire.
            if (this.hasUserActivity()) {
              return;
            }

            this.conversationId = response.data.id;
            this.messages = response.data.messages ?? [];
            if (this.messages.length === 0) {
              this.showWelcome();
            } else {
              this.scrollToBottomSoon();
            }
          } else {
            this.showWelcome();
          }
        },
        error: () => {
          this.isLoadingConversation = false;
          this.showWelcome();
        }
      })
    );
  }

  /** Repart sur une conversation vierge (l'ancienne reste en historique). */
  newConversation(): void {
    this.stopListening();
    this.stopSpeaking();
    this.conversationId = null;
    this.messages = [];
    this.inputText = '';
    this.voiceNotice = null;
    this.showWelcome();
    this.focusInputSoon();
  }

  /** Bandeau d'accueil local, affiché tant qu'aucun message serveur n'existe. */
  private showWelcome(): void {
    if (this.messages.length > 0) return;

    this.messages = [{
      id: 'local-welcome',
      role: 'assistant',
      content: this.buildWelcomeText(),
      toolsUsed: [],
      createdAt: new Date().toISOString(),
      isLocal: true
    }];
    this.scrollToBottomSoon();
  }

  private buildWelcomeText(): string {
    const name = this.userFirstName ? ` ${this.userFirstName}` : '';
    return `Bonjour${name}, je suis l'assistant MIAV. ` +
      `Je peux vous renseigner sur les membres, les offrandes, les événements et bien plus. ` +
      `Choisissez une suggestion ou posez votre question.`;
  }

  private loadCurrentUserName(): void {
    this.subscriptions.add(
      this.authService.getCurrentUser().subscribe({
        next: (user) => {
          this.userFirstName = user?.firstName || '';
          // Le prénom arrive souvent après l'ouverture : on rafraîchit l'accueil.
          if (this.userFirstName) {
            this.messages = this.messages.map((message) =>
              message.id === 'local-welcome'
                ? { ...message, content: this.buildWelcomeText() }
                : message
            );
          }
        },
        error: () => {
          this.userFirstName = '';
        }
      })
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // ENVOI DE MESSAGE
  // ────────────────────────────────────────────────────────────────────

  get canSend(): boolean {
    return this.inputText.trim().length > 0 && !this.isSending;
  }

  /** Suggestions affichées uniquement avant le premier échange réel. */
  get showSuggestions(): boolean {
    if (this.isLoadingConversation || this.isSending) return false;
    return this.messages.filter((message) => !message.isLocal).length === 0;
  }

  onInputChange(value: string): void {
    this.inputText = value;
    this.lastInputMode = 'text';
  }

  /** Entrée envoie, Maj+Entrée insère un saut de ligne. */
  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage(text?: string): void {
    const content = (text ?? this.inputText).trim();
    if (!content || this.isSending) return;

    const inputMode = this.lastInputMode;
    this.stopListening();
    this.stopSpeaking();
    this.voiceNotice = null;

    const userMessage: AgentMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content,
      toolsUsed: [],
      inputMode,
      createdAt: new Date().toISOString()
    };

    const request: AgentChatRequest = { message: content, inputMode };
    if (this.conversationId) {
      request.conversationId = this.conversationId;
    }

    this.inputText = '';
    this.lastInputMode = 'text';
    this.messages = [...this.messages, userMessage];
    this.isSending = true;
    this.agentState = 'thinking';
    this.scrollToBottomSoon();

    this.subscriptions.add(
      this.agentApi.chat(request).subscribe({
        next: (response) => {
          this.isSending = false;

          if (response.success && response.data) {
            this.conversationId = response.data.conversationId;

            // Le backend renvoie 'reply' ; tolérance transitoire sur 'message'
            // pour éviter une bulle vide si le déploiement est désynchronisé.
            const reply = (response.data.reply
              ?? (response.data as { message?: string }).message
              ?? '').trim();

            if (!reply) {
              this.agentState = 'idle';
              this.pushErrorMessage("L'assistant n'a pas renvoyé de réponse. Reformulez votre demande.");
              return;
            }

            this.messages = [...this.messages, {
              id: `local-assistant-${Date.now()}`,
              role: 'assistant',
              content: reply,
              toolsUsed: response.data.toolsUsed ?? [],
              createdAt: response.data.createdAt || new Date().toISOString()
            }];
            this.agentState = 'idle';
            this.speak(reply);
            this.scrollToBottomSoon();
          } else {
            this.agentState = 'idle';
            this.pushErrorMessage(response.message, response.statusCode);
          }
        },
        error: (error: Error) => {
          this.isSending = false;
          this.agentState = 'idle';
          this.pushErrorMessage(error.message);
        }
      })
    );
  }

  private pushErrorMessage(message: string, statusCode?: number): void {
    const friendly = this.buildFriendlyError(statusCode, message);

    // L'intercepteur affiche déjà un toast pour 403 et 429 : ne pas doublonner.
    if (statusCode !== 403 && statusCode !== 429) {
      this.notification.error('Assistant MIAV', friendly);
    }

    this.messages = [...this.messages, {
      id: `local-error-${Date.now()}`,
      role: 'assistant',
      content: friendly,
      toolsUsed: [],
      createdAt: new Date().toISOString(),
      isLocal: true,
      isError: true
    }];
    this.scrollToBottomSoon();
  }

  private buildFriendlyError(statusCode: number | undefined, fallback: string): string {
    switch (statusCode) {
      case 401:
        return 'Votre session a expiré. Veuillez vous reconnecter.';
      case 403:
        return "Vous n'avez pas la permission d'utiliser l'assistant.";
      case 429:
        return 'Trop de requêtes envoyées. Merci de patienter quelques instants.';
      default:
        return fallback || 'Une erreur est survenue. Veuillez réessayer.';
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // ENTRÉE VOCALE (Web Speech API)
  // ────────────────────────────────────────────────────────────────────

  private getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
    if (!this.isBrowser) return null;
    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
  }

  toggleListening(): void {
    if (!this.speechSupported) return;
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  private startListening(): void {
    const Ctor = this.getSpeechRecognitionCtor();
    if (!Ctor) return;

    this.stopSpeaking();
    this.voiceNotice = null;

    try {
      const recognition = new Ctor();
      recognition.lang = 'fr-FR';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      this.interimBase = this.inputText ? `${this.inputText.trim()} ` : '';

      recognition.onresult = (event) => {
        let finalText = '';
        let interimText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript ?? '';
          if (result.isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }

        if (finalText) {
          this.interimBase = `${this.interimBase}${finalText.trim()} `;
          this.lastInputMode = 'voice';
        }

        this.inputText = `${this.interimBase}${interimText}`.trim();
      };

      recognition.onerror = (event) => {
        this.isListening = false;
        if (this.agentState === 'listening') {
          this.agentState = 'idle';
        }
        this.showVoiceNotice(this.buildVoiceErrorMessage(event.error));
      };

      recognition.onend = () => {
        this.isListening = false;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        this.recognition = null;
        if (this.agentState === 'listening') {
          this.agentState = 'idle';
        }
        if (this.lastInputMode === 'voice') {
          this.focusInputSoon();
        }
      };

      this.recognition = recognition;
      recognition.start();
      this.isListening = true;
      this.agentState = 'listening';
    } catch {
      // Certains navigateurs exposent l'API mais refusent un second démarrage.
      this.isListening = false;
      this.agentState = 'idle';
      this.showVoiceNotice('La saisie vocale est momentanément indisponible.');
    }
  }

  private stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Déjà arrêtée par le navigateur.
      }
      this.recognition = null;
    }
    this.isListening = false;
    if (this.agentState === 'listening') {
      this.agentState = 'idle';
    }
  }

  private buildVoiceErrorMessage(code: string): string {
    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Accès au microphone refusé. Autorisez-le dans votre navigateur.';
      case 'no-speech':
        return 'Aucune parole détectée. Réessayez en parlant plus près du micro.';
      case 'audio-capture':
        return 'Aucun microphone détecté sur cet appareil.';
      case 'network':
        return 'La reconnaissance vocale nécessite une connexion Internet.';
      default:
        return 'La saisie vocale a échoué. Veuillez réessayer.';
    }
  }

  private showVoiceNotice(message: string): void {
    this.voiceNotice = message;
    if (this.voiceNoticeTimer) clearTimeout(this.voiceNoticeTimer);
    this.voiceNoticeTimer = setTimeout(() => {
      this.voiceNotice = null;
      this.voiceNoticeTimer = null;
    }, 5000);
  }

  // ────────────────────────────────────────────────────────────────────
  // SORTIE VOCALE (SpeechSynthesis)
  // ────────────────────────────────────────────────────────────────────

  toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
    try {
      localStorage.setItem(this.soundStorageKey, this.soundEnabled ? 'on' : 'off');
    } catch {
      // Préférence non persistée : comportement dégradé acceptable.
    }
    if (!this.soundEnabled) {
      this.stopSpeaking();
    }
  }

  private readSoundPreference(): boolean {
    try {
      return localStorage.getItem(this.soundStorageKey) !== 'off';
    } catch {
      return true;
    }
  }

  /** Lit la réponse à voix haute si le son est activé et le panneau ouvert. */
  private speak(text: string): void {
    if (!this.soundEnabled || !this.isOpen || !this.isBrowser ||
        typeof window.speechSynthesis === 'undefined') {
      return;
    }

    const clean = this.stripMarkdownForSpeech(text);
    if (!clean) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'fr-FR';

    const voice = this.findFrenchVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      if (this.agentState !== 'listening') {
        this.agentState = 'speaking';
      }
    };
    utterance.onend = () => {
      if (this.agentState === 'speaking') {
        this.agentState = 'idle';
      }
    };
    utterance.onerror = () => {
      if (this.agentState === 'speaking') {
        this.agentState = 'idle';
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  private findFrenchVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices?.() ?? [];
    return voices.find((voice) => (voice.lang || '').toLowerCase().startsWith('fr')) ?? null;
  }

  /** Coupe la parole en cours (envoi, fermeture, mise en sourdine, destroy). */
  private stopSpeaking(): void {
    if (!this.isBrowser || typeof window.speechSynthesis === 'undefined') return;
    window.speechSynthesis.cancel();
    if (this.agentState === 'speaking') {
      this.agentState = 'idle';
    }
  }

  /** Retire balisage Markdown et émojis : la synthèse ne doit pas les lire. */
  private stripMarkdownForSpeech(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_~#>]+/g, ' ')
      .replace(/^\s*[-+]\s+/gm, ' ')
      .replace(/\p{Extended_Pictographic}/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ────────────────────────────────────────────────────────────────────
  // AFFICHAGE
  // ────────────────────────────────────────────────────────────────────

  get stateLabel(): string {
    switch (this.agentState) {
      case 'listening':
        return 'En écoute';
      case 'thinking':
        return 'Réflexion…';
      case 'speaking':
        return 'En train de parler';
      default:
        return 'En ligne';
    }
  }

  trackByMessage(index: number, message: AgentMessage): string | number {
    return message.id;
  }

  formatTime(value?: string | null): string {
    const date = value ? new Date(value) : new Date();
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  formatToolList(tools?: string[] | null): string {
    return (tools ?? []).join(', ');
  }

  private scrollToBottomSoon(): void {
    if (!this.isBrowser) return;
    setTimeout(() => {
      const container = this.messagesContainer?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  }

  private focusInputSoon(): void {
    if (!this.isBrowser) return;
    setTimeout(() => this.messageInput?.nativeElement?.focus(), 120);
  }
}
