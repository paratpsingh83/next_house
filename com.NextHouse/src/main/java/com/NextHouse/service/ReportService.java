package com.NextHouse.service;

import com.NextHouse.dto.common.PageResponseDTO;
import com.NextHouse.dto.request.CreateReportRequestDTO;
import com.NextHouse.entity.Report;

public interface ReportService {

    void createReport(Long currentUserId, CreateReportRequestDTO dto);

    PageResponseDTO<Report> getAllReports(String status, String entityType, int page, int size);

    void reviewReport(Long reportId, Long adminUserId, String decision, String resolvedNote);

    long countPendingReports();
}
