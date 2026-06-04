package com.NextHouse.service;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.*;
import com.NextHouse.dto.response.*;

public interface PostService {

    PostResponseDTO createPost(Long currentUserId, CreatePostRequestDTO dto);

    PostResponseDTO getPost(Long postId, Long currentUserId);

    PostResponseDTO updatePost(Long postId, Long currentUserId, UpdatePostRequestDTO dto);

    void deletePost(Long postId, Long currentUserId);

    // Feed
    PageResponseDTO<PostResponseDTO> getFollowingFeed(Long currentUserId, int page, int size);

    PageResponseDTO<PostResponseDTO> getNearbyFeed(Long currentUserId, NearbySearchRequestDTO geoDto, int page, int size);

    PageResponseDTO<PostResponseDTO> getTrendingFeed(Long currentUserId, Long neighborhoodId, int page, int size);

    PageResponseDTO<PostResponseDTO> getCommunityFeed(Long currentUserId, Long communityId, int page, int size);

    PageResponseDTO<PostResponseDTO> getUserPosts(Long userId, Long currentUserId, int page, int size);

    PageResponseDTO<PostResponseDTO> getHashtagFeed(String hashtag, Long currentUserId, int page, int size);

    // Engagement
    void reactToPost(Long postId, Long currentUserId, ReactPostRequestDTO dto);

    void removeReaction(Long postId, Long currentUserId);

    void savePost(Long postId, Long currentUserId);

    void unsavePost(Long postId, Long currentUserId);

    PageResponseDTO<PostResponseDTO> getSavedPosts(Long currentUserId, String collection, int page, int size);

    void sharePost(Long postId, Long currentUserId);

    // Comments
    PostCommentResponseDTO addComment(Long postId, Long currentUserId, CreateCommentRequestDTO dto);

    PostCommentResponseDTO updateComment(Long commentId, Long currentUserId, CreateCommentRequestDTO dto);

    void deleteComment(Long commentId, Long currentUserId);

    PageResponseDTO<PostCommentResponseDTO> getComments(Long postId, int page, int size);

    PageResponseDTO<PostCommentResponseDTO> getReplies(Long commentId, int page, int size);

    void reactToComment(Long commentId, Long currentUserId, String reactionType);
}
