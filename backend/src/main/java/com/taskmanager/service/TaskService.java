package com.taskmanager.service;

import com.taskmanager.dto.TaskDto;
import com.taskmanager.dto.TaskRequest;
import com.taskmanager.model.Task;
import com.taskmanager.model.TaskPriority;
import com.taskmanager.model.TaskStatus;
import com.taskmanager.model.User;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskService(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<TaskDto> listForUser(String username, TaskStatus status, TaskPriority priority) {
        User user = getUser(username);
        List<Task> tasks;
        if (status != null && priority != null) {
            tasks = taskRepository.findByUserAndStatusAndPriorityOrderByUpdatedAtDesc(user, status, priority);
        } else if (status != null) {
            tasks = taskRepository.findByUserAndStatusOrderByUpdatedAtDesc(user, status);
        } else if (priority != null) {
            tasks = taskRepository.findByUserAndPriorityOrderByUpdatedAtDesc(user, priority);
        } else {
            tasks = taskRepository.findByUserOrderByUpdatedAtDesc(user);
        }
        return tasks.stream().map(TaskDto::fromEntity).toList();
    }

    @Transactional
    public TaskDto create(String username, TaskRequest request) {
        User user = getUser(username);
        Task task = new Task();
        task.setUser(user);
        applyRequest(task, request);
        return TaskDto.fromEntity(taskRepository.save(task));
    }

    @Transactional
    public TaskDto update(String username, Long id, TaskRequest request) {
        User user = getUser(username);
        Task task = taskRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        applyRequest(task, request);
        return TaskDto.fromEntity(taskRepository.save(task));
    }

    @Transactional
    public void delete(String username, Long id) {
        User user = getUser(username);
        Task task = taskRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        taskRepository.delete(task);
    }

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("User not found"));
    }

    private void applyRequest(Task task, TaskRequest request) {
        task.setTitle(request.getTitle().trim());
        task.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
        }
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }
    }
}
