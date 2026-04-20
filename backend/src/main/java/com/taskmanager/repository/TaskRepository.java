package com.taskmanager.repository;

import com.taskmanager.model.Task;
import com.taskmanager.model.TaskPriority;
import com.taskmanager.model.TaskStatus;
import com.taskmanager.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByUserOrderByUpdatedAtDesc(User user);

    List<Task> findByUserAndStatusOrderByUpdatedAtDesc(User user, TaskStatus status);

    List<Task> findByUserAndPriorityOrderByUpdatedAtDesc(User user, TaskPriority priority);

    List<Task> findByUserAndStatusAndPriorityOrderByUpdatedAtDesc(
            User user, TaskStatus status, TaskPriority priority);

    Optional<Task> findByIdAndUser(Long id, User user);
}
