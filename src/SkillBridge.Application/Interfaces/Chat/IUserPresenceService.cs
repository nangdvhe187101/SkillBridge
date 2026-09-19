using System.Collections.Generic;

namespace SkillBridge.Application.Interfaces.Chat;

/**
 * Quản lý trạng thái trực tuyến (Online/Offline) thời gian thực của người dùng
 */
public interface IUserPresenceService
{
    bool IsUserOnline(int userId);
    IReadOnlyCollection<int> GetOnlineUserIds();
    bool AddConnection(int userId, string connectionId);
    bool RemoveConnection(int userId, string connectionId);
}
