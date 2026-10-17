using System;
using System.Collections.Generic;

namespace SkillBridge.Application.Common;

/// <summary>
/// Validates state transitions for domain entities (Jobs, Applications, Disputes)
/// to prevent invalid status jumping and enforce core business flow integrity.
/// </summary>
public static class StateMachineValidator
{
    /// <summary>
    /// Valid Job status transitions.
    /// Actual statuses in SkillBridge:
    /// 'open', 'in_progress', 'submitted', 'revision_requested', 'completed', 'cancelled', 'disputed'
    /// </summary>
    private static readonly Dictionary<string, HashSet<string>> JobTransitions = new()
    {
        ["open"] = new() { "in_progress", "cancelled" },
        ["in_progress"] = new() { "submitted", "revision_requested", "cancelled", "disputed", "completed", "open" },
        ["submitted"] = new() { "completed", "revision_requested", "disputed", "cancelled", "open" },
        ["revision_requested"] = new() { "submitted", "disputed", "cancelled", "open" },
        ["disputed"] = new() { "completed", "cancelled", "in_progress" },
        ["cancelled"] = new() { "open" }, // Employer can reopen a cancelled job
        ["completed"] = new() { }          // Terminal state
    };

    /// <summary>
    /// Valid Application status transitions.
    /// Actual statuses in SkillBridge:
    /// 'pending', 'awaiting_verification', 'hired', 'submitted', 'rejected', 'cancelled', 'completed'
    /// </summary>
    private static readonly Dictionary<string, HashSet<string>> ApplicationTransitions = new()
    {
        ["pending"] = new() { "awaiting_verification", "hired", "rejected", "cancelled" },
        ["awaiting_verification"] = new() { "pending", "rejected", "cancelled" },
        ["hired"] = new() { "submitted", "cancelled", "completed" },
        ["submitted"] = new() { "hired", "completed", "cancelled" },
        ["rejected"] = new() { "pending" }, // Can revert to pending if hired candidate drops out
        ["cancelled"] = new() { },          // Terminal state
        ["completed"] = new() { }           // Terminal state
    };

    /// <summary>
    /// Valid Dispute status transitions.
    /// Actual statuses in SkillBridge: 'open', 'pending', 'under_review', 'resolved', 'closed', 'cancelled'
    /// </summary>
    private static readonly Dictionary<string, HashSet<string>> DisputeTransitions = new()
    {
        ["open"] = new() { "under_review", "closed", "resolved", "cancelled" },
        ["pending"] = new() { "open", "under_review", "closed", "resolved", "cancelled" },
        ["under_review"] = new() { "closed", "resolved", "cancelled" },
        ["resolved"] = new() { "closed" },
        ["closed"] = new() { },
        ["cancelled"] = new() { }
    };

    public static void ValidateJobTransition(string currentStatus, string newStatus)
    {
        if (string.IsNullOrWhiteSpace(currentStatus) || string.IsNullOrWhiteSpace(newStatus))
        {
            throw new BusinessException("Trạng thái công việc không được để trống.");
        }

        var current = currentStatus.ToLowerInvariant().Trim();
        var next = newStatus.ToLowerInvariant().Trim();

        if (current == next) return;

        if (!JobTransitions.ContainsKey(current))
        {
            throw new BusinessException($"Trạng thái công việc hiện tại '{currentStatus}' không hợp lệ.");
        }

        if (!JobTransitions[current].Contains(next))
        {
            throw new BusinessException(
                $"Không thể chuyển trạng thái công việc từ '{currentStatus}' sang '{newStatus}'. " +
                $"Các trạng thái hợp lệ tiếp theo: {string.Join(", ", JobTransitions[current])}"
            );
        }
    }

    public static void ValidateApplicationTransition(string currentStatus, string newStatus)
    {
        if (string.IsNullOrWhiteSpace(currentStatus) || string.IsNullOrWhiteSpace(newStatus))
        {
            throw new BusinessException("Trạng thái ứng tuyển không được để trống.");
        }

        var current = currentStatus.ToLowerInvariant().Trim();
        var next = newStatus.ToLowerInvariant().Trim();

        if (current == next) return;

        if (!ApplicationTransitions.ContainsKey(current))
        {
            throw new BusinessException($"Trạng thái ứng tuyển hiện tại '{currentStatus}' không hợp lệ.");
        }

        if (!ApplicationTransitions[current].Contains(next))
        {
            throw new BusinessException(
                $"Không thể chuyển trạng thái đơn ứng tuyển từ '{currentStatus}' sang '{newStatus}'. " +
                $"Các trạng thái hợp lệ tiếp theo: {string.Join(", ", ApplicationTransitions[current])}"
            );
        }
    }

    public static void ValidateDisputeTransition(string currentStatus, string newStatus)
    {
        if (string.IsNullOrWhiteSpace(currentStatus) || string.IsNullOrWhiteSpace(newStatus))
        {
            throw new BusinessException("Trạng thái khiếu nại không được để trống.");
        }

        var current = currentStatus.ToLowerInvariant().Trim();
        var next = newStatus.ToLowerInvariant().Trim();

        if (current == next) return;

        if (!DisputeTransitions.ContainsKey(current))
        {
            throw new BusinessException($"Trạng thái khiếu nại hiện tại '{currentStatus}' không hợp lệ.");
        }

        if (!DisputeTransitions[current].Contains(next))
        {
            throw new BusinessException(
                $"Không thể chuyển trạng thái khiếu nại từ '{currentStatus}' sang '{newStatus}'. " +
                $"Các trạng thái hợp lệ tiếp theo: {string.Join(", ", DisputeTransitions[current])}"
            );
        }
    }
}
