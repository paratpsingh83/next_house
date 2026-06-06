package com.NextHouse.repository;

import com.NextHouse.entity.ChatMessageDeletion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatMessageDeletionRepository extends JpaRepository<ChatMessageDeletion, Long> {
    boolean existsByMessageIdAndUserId(Long messageId, Long userId);
}