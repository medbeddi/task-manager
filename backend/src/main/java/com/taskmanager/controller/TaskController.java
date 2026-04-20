package com.taskmanager.controller;

import com.taskmanager.dto.TaskDto;
import com.taskmanager.dto.TaskRequest;
import com.taskmanager.model.TaskPriority;
import com.taskmanager.model.TaskStatus;
import com.taskmanager.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public ResponseEntity<List<TaskDto>> list(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) TaskPriority priority) {
        return ResponseEntity.ok(taskService.listForUser(principal.getUsername(), status, priority));
    }

    @PostMapping
    public ResponseEntity<TaskDto> create(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(taskService.create(principal.getUsername(), request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskDto> update(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long id,
            @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(taskService.update(principal.getUsername(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long id) {
        taskService.delete(principal.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}
