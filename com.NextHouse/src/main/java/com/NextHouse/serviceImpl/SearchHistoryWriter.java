package com.NextHouse.serviceImpl;

import com.NextHouse.entity.SearchHistory;
import com.NextHouse.repository.SearchHistoryRepository;
import com.NextHouse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class SearchHistoryWriter {

    private final SearchHistoryRepository searchHistoryRepository;
    private final UserRepository           userRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long userId, String keyword, String searchType, int resultCount) {
        if (userId == null || keyword == null || keyword.isBlank()) return;
        userRepository.findById(userId).ifPresent(user ->
            searchHistoryRepository.save(SearchHistory.builder()
                .user(user)
                .keyword(keyword)
                .searchType(searchType != null ? searchType : "ALL")
                .resultCount(resultCount)
                .build()));
    }
}