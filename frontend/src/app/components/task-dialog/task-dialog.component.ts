import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Task, TaskPayload, TaskPriority, TaskStatus } from '../../services/task.service';

export interface TaskDialogData {
  task?: Task;
}

@Component({
  selector: 'task-manager-task-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './task-dialog.component.html',
  styleUrl: './task-dialog.component.scss'
})
export class TaskDialogComponent {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<TaskDialogComponent, TaskPayload | undefined>);

  readonly isEdit = !!this.data.task;

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

  readonly form = this.fb.nonNullable.group({
    title: [this.data.task?.title ?? '', [Validators.required, Validators.maxLength(255)]],
    description: [this.data.task?.description ?? ''],
    status: [this.data.task?.status ?? 'PENDING', Validators.required],
    priority: [this.data.task?.priority ?? 'MEDIUM', Validators.required]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: TaskDialogData) {}

  cancel(): void {
    this.dialogRef.close(undefined);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.buildPayload());
  }

  private buildPayload(): TaskPayload {
    const v = this.form.getRawValue();
    return {
      title: v.title.trim(),
      description: v.description?.trim() || null,
      status: v.status,
      priority: v.priority
    };
  }
}
