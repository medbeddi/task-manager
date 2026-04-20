import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TaskService, Task, TaskPayload, TaskPriority, TaskStatus } from '../../services/task.service';
import { TaskDialogComponent, TaskDialogData } from '../task-dialog/task-dialog.component';

@Component({
  selector: 'task-manager-tasks',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
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

  readonly statusOptions: { value: TaskStatus; label: string }[] = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'DONE', label: 'Done' }
  ];

  readonly priorityOptions: { value: TaskPriority; label: string }[] = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' }
  ];

  readonly sortOptions = [
    { value: 'updatedDesc', label: 'Recently updated' },
    { value: 'updatedAsc', label: 'Least recently updated' },
    { value: 'priorityDesc', label: 'Priority: high to low' },
    { value: 'priorityAsc', label: 'Priority: low to high' },
    { value: 'titleAsc', label: 'Title: A to Z' },
    { value: 'titleDesc', label: 'Title: Z to A' }
  ] as const;

  readonly priorityWeight: Record<TaskPriority, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3
  };

  tasks: Task[] = [];
  loading = false;

  searchQuery = '';
  sortBy: (typeof this.sortOptions)[number]['value'] = 'updatedDesc';
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

  clearFilters(): void {
    this.filterStatus = '';
    this.filterPriority = '';
    this.searchQuery = '';
    this.sortBy = 'updatedDesc';
    this.load();
  }

  get filteredTasks(): Task[] {
    const query = this.searchQuery.trim().toLowerCase();

    const filtered = this.tasks.filter((task) => {
      if (!query) {
        return true;
      }
      return (
        task.title.toLowerCase().includes(query) ||
        (task.description ?? '').toLowerCase().includes(query)
      );
    });

    return filtered.sort((a, b) => this.compareTasks(a, b));
  }

  get totalCount(): number {
    return this.tasks.length;
  }

  get pendingCount(): number {
    return this.tasks.filter((task) => task.status === 'PENDING').length;
  }

  get inProgressCount(): number {
    return this.tasks.filter((task) => task.status === 'IN_PROGRESS').length;
  }

  get doneCount(): number {
    return this.tasks.filter((task) => task.status === 'DONE').length;
  }

  get completionRate(): number {
    if (!this.totalCount) {
      return 0;
    }
    return Math.round((this.doneCount / this.totalCount) * 100);
  }

  markAsDone(task: Task): void {
    this.updateStatus(task, 'DONE');
  }

  duplicateTask(task: Task): void {
    const payload: TaskPayload = {
      title: `${task.title} (copy)`,
      description: task.description,
      status: 'PENDING',
      priority: task.priority
    };
    this.tasksApi.createTask(payload).subscribe({
      next: () => {
        this.snack.open('Task duplicated', 'OK', { duration: 2500 });
        this.load();
      },
      error: (err) => this.showApiError(err, 'Could not duplicate task')
    });
  }

  deleteDoneTasks(): void {
    const doneTasks = this.tasks.filter((task) => task.status === 'DONE');
    if (!doneTasks.length) {
      return;
    }
    if (!confirm(`Delete ${doneTasks.length} completed task(s)?`)) {
      return;
    }
    this.loading = true;
    forkJoin(doneTasks.map((task) => this.tasksApi.deleteTask(task.id))).subscribe({
      next: () => {
        this.snack.open(`${doneTasks.length} completed task(s) deleted`, 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.loading = false;
        this.showApiError(err, 'Could not delete completed tasks');
      }
    });
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

  private compareTasks(a: Task, b: Task): number {
    switch (this.sortBy) {
      case 'updatedAsc':
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case 'priorityDesc':
        return this.priorityWeight[b.priority] - this.priorityWeight[a.priority];
      case 'priorityAsc':
        return this.priorityWeight[a.priority] - this.priorityWeight[b.priority];
      case 'titleAsc':
        return a.title.localeCompare(b.title);
      case 'titleDesc':
        return b.title.localeCompare(a.title);
      case 'updatedDesc':
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
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
