import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { TaskService, Task, TaskPayload, TaskPriority, TaskStatus } from '../../services/task.service';
import { TaskDialogComponent, TaskDialogData } from '../task-dialog/task-dialog.component';

@Component({
  selector: 'task-manager-tasks',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss'
})
export class TasksComponent implements OnInit {
  private readonly tasksApi = inject(TaskService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  tasks: Task[] = [];
  loading = false;

  filterStatus: TaskStatus | '' = '';
  filterPriority: TaskPriority | '' = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const st = this.filterStatus || undefined;
    const pr = this.filterPriority || undefined;
    this.tasksApi.getTasks(st ?? null, pr ?? null).subscribe({
      next: (list) => {
        this.tasks = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Could not load tasks', 'Dismiss', { duration: 4000 });
      }
    });
  }

  onFilterChange(): void {
    this.load();
  }

  openCreate(): void {
    const ref = this.dialog.open<TaskDialogComponent, TaskDialogData, TaskPayload | undefined>(TaskDialogComponent, {
      width: '520px',
      data: {}
    });
    ref.afterClosed().subscribe((payload) => {
      if (!payload) {
        return;
      }
      this.tasksApi.createTask(payload).subscribe({
        next: () => {
          this.snack.open('Task created', 'OK', { duration: 2500 });
          this.load();
        },
        error: (err) => this.showApiError(err, 'Could not create task')
      });
    });
  }

  openEdit(task: Task): void {
    const ref = this.dialog.open<TaskDialogComponent, TaskDialogData, TaskPayload | undefined>(TaskDialogComponent, {
      width: '520px',
      data: { task }
    });
    ref.afterClosed().subscribe((payload) => {
      if (!payload) {
        return;
      }
      this.tasksApi.updateTask(task.id, payload).subscribe({
        next: () => {
          this.snack.open('Task updated', 'OK', { duration: 2500 });
          this.load();
        },
        error: (err) => this.showApiError(err, 'Could not update task')
      });
    });
  }

  updateStatus(task: Task, status: TaskStatus): void {
    if (task.status === status) {
      return;
    }
    this.tasksApi
      .updateTask(task.id, {
        title: task.title,
        description: task.description,
        status,
        priority: task.priority
      })
      .subscribe({
        next: () => this.load(),
        error: (err) => this.showApiError(err, 'Could not update status')
      });
  }

  deleteTask(task: Task): void {
    if (!confirm(`Delete “${task.title}”?`)) {
      return;
    }
    this.tasksApi.deleteTask(task.id).subscribe({
      next: () => {
        this.snack.open('Task deleted', 'OK', { duration: 2500 });
        this.load();
      },
      error: (err) => this.showApiError(err, 'Could not delete task')
    });
  }

  priorityLabel(p: TaskPriority): string {
    switch (p) {
      case 'LOW':
        return 'Low';
      case 'MEDIUM':
        return 'Medium';
      case 'HIGH':
        return 'High';
    }
  }

  private showApiError(err: unknown, fallback: string): void {
    const msg =
      err && typeof err === 'object' && 'error' in err
        ? (err as { error?: { message?: string } }).error?.message
        : undefined;
    this.snack.open(typeof msg === 'string' ? msg : fallback, 'Dismiss', { duration: 5000 });
  }
}
