package com.NextHouse.repository;

import com.NextHouse.entity.PostHashtag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface PostHashtagRepository extends JpaRepository<PostHashtag, Long> {

    @Modifying
    @Transactional
    @Query("DELETE FROM PostHashtag ph WHERE ph.post.id = :postId")
    void deleteByPostId(@Param("postId") Long postId);
}
