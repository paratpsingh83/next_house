package com.NextHouse.service;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.CreateBorrowRequestDTO;
import com.NextHouse.dto.response.BorrowRequestResponseDTO;

public interface BorrowRequestService {

    BorrowRequestResponseDTO createRequest(Long currentUserId, CreateBorrowRequestDTO dto);

    BorrowRequestResponseDTO getRequest(Long requestId);

    PageResponseDTO<BorrowRequestResponseDTO> getNeighborhoodRequests(Long neighborhoodId, String status, int page, int size);

    PageResponseDTO<BorrowRequestResponseDTO> getMyRequests(Long currentUserId, int page, int size);

    BorrowRequestResponseDTO respondToRequest(Long requestId, Long currentUserId);

    void closeRequest(Long requestId, Long currentUserId);

    void deleteRequest(Long requestId, Long currentUserId);
}
