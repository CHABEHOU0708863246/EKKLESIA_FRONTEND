// src/app/core/models/Agent/agent.models.ts
// Contrats de l'assistant conversationnel MIAV (backend AgentController).

import { ApiResponse, ApiResponseSimple } from '../Common/api-response.model';

/** Rôle d'un message dans une conversation. */
export type AgentMessageRole = 'user' | 'assistant' | 'tool';

/** Origine de la saisie : clavier ou dictée vocale. */
export type AgentInputMode = 'text' | 'voice';

/** État visible de l'assistant dans l'interface. */
export type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';

/** Corps POST /api/v1/Agent/chat */
export interface AgentChatRequest {
  conversationId?: string;
  message: string;
  inputMode?: AgentInputMode;
}

/** Données renvoyées par POST /api/v1/Agent/chat */
export interface AgentChatData {
  conversationId: string;
  reply: string;
  toolsUsed: string[];
  createdAt: string;
}

export type AgentChatResponse = ApiResponse<AgentChatData>;

/** Élément de GET /api/v1/Agent/conversations */
export interface AgentConversation {
  id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
}

export type AgentConversationsResponse = ApiResponse<AgentConversation[]>;

/** Message d'une conversation (GET /api/v1/Agent/conversations/{id}). */
export interface AgentMessage {
  id: string | number;
  role: AgentMessageRole;
  content: string;
  toolsUsed?: string[] | null;
  inputMode?: AgentInputMode | null;
  createdAt?: string | null;
  /** Message produit localement (accueil, erreur) : jamais persisté côté serveur. */
  isLocal?: boolean;
  /** Message local signalant une erreur de l'assistant. */
  isError?: boolean;
}

/** Détail d'une conversation (GET /api/v1/Agent/conversations/{id}). */
export interface AgentConversationDetail {
  id: string;
  title: string;
  messages: AgentMessage[];
}

export type AgentConversationDetailResponse = ApiResponse<AgentConversationDetail>;

/** Outil exposé par GET /api/v1/Agent/tools */
export interface AgentTool {
  name: string;
  description: string;
}

export type AgentToolsResponse = ApiResponse<AgentTool[]>;

export type AgentDeleteResponse = ApiResponseSimple;
