import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
}

export interface TaskPayload {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/tasks`;

  getTasks(status?: TaskStatus | null, priority?: TaskPriority | null): Observable<Task[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    if (priority) {
      params = params.set('priority', priority);
    }
    return this.http.get<Task[]>(this.base, { params });
  }

  createTask(body: TaskPayload): Observable<Task> {
    return this.http.post<Task>(this.base, body);
  }

  updateTask(id: number, body: TaskPayload): Observable<Task> {
    return this.http.put<Task>(`${this.base}/${id}`, body);
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
