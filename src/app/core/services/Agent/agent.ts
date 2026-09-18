// src/app/core/services/Agent/agent.ts
// Service de l'assistant conversationnel MIAV (backend AgentController).

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/Common/api-response.model';
import {
  AgentChatData,
  AgentChatRequest,
  AgentChatResponse,
  AgentConversation,
  AgentConversationDetail,
  AgentConversationDetailResponse,
  AgentConversationsResponse,
  AgentDeleteResponse,
  AgentTool,
  AgentToolsResponse
} from '../../models/Agent/agent.models';

/**
 * Service de l'assistant MIAV.
 * Correspond au backend AgentController (chat, conversations, outils).
 */
@Injectable({
  providedIn: 'root'
})
export class Agent {

  private readonly baseUrl = `${environment.apiUrl}/api/v1/Agent`;

  constructor(private http: HttpClient) { }

  /**
   * Envoie un message à l'assistant et récupère sa réponse.
   * POST /api/v1/Agent/chat
   */
  chat(request: AgentChatRequest): Observable<AgentChatResponse> {
    return this.http.post<AgentChatResponse>(`${this.baseUrl}/chat`, request)
      .pipe(catchError(this.handleError<AgentChatData>('chat')));
  }

  /**
   * Liste les conversations de l'utilisateur connecté.
   * GET /api/v1/Agent/conversations
   */
  getConversations(): Observable<AgentConversationsResponse> {
    return this.http.get<AgentConversationsResponse>(`${this.baseUrl}/conversations`)
      .pipe(catchError(this.handleError<AgentConversation[]>('getConversations')));
  }

  /**
   * Récupère le détail d'une conversation et ses messages.
   * GET /api/v1/Agent/conversations/{id}
   */
  getConversation(id: string): Observable<AgentConversationDetailResponse> {
    return this.http.get<AgentConversationDetailResponse>(`${this.baseUrl}/conversations/${id}`)
      .pipe(catchError(this.handleError<AgentConversationDetail>('getConversation')));
  }

  /**
   * Supprime une conversation.
   * DELETE /api/v1/Agent/conversations/{id}
   */
  deleteConversation(id: string): Observable<AgentDeleteResponse> {
    return this.http.delete<AgentDeleteResponse>(`${this.baseUrl}/conversations/${id}`)
      .pipe(catchError(this.handleError<never>('deleteConversation')));
  }

  /**
   * Liste les outils accessibles à l'assistant.
   * GET /api/v1/Agent/tools
   */
  getTools(): Observable<AgentToolsResponse> {
    return this.http.get<AgentToolsResponse>(`${this.baseUrl}/tools`)
      .pipe(catchError(this.handleError<AgentTool[]>('getTools')));
  }

  /**
   * Gestionnaire d'erreurs standardisé : transforme l'erreur HTTP en réponse
   * `success: false` pour que l'appelant affiche un message sans double toast
   * (l'intercepteur gère déjà 403 et 429).
   */
  private handleError<T>(operation = 'operation') {
    return (error: any): Observable<ApiResponse<T>> => {
      console.error(`Erreur Agent.${operation}:`, error);

      let errorMessage = 'Une erreur est survenue';
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      const response: ApiResponse<T> = {
        success: false,
        message: errorMessage,
        data: null as any,
        errors: error?.error?.errors || [],
        statusCode: typeof error?.status === 'number' ? error.status : undefined
      };

      return of(response);
    };
  }
}
