using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using SkillBridge.Application.Interfaces.Chat;

namespace SkillBridge.Infrastructure.Services.Chat;

public class UserPresenceService : IUserPresenceService
{
    // Lưu trữ ánh xạ UserId -> Set các ConnectionId đang mở
    private readonly ConcurrentDictionary<int, HashSet<string>> _onlineUsers = new();

    public bool IsUserOnline(int userId)
    {
        return _onlineUsers.TryGetValue(userId, out var connections) && connections.Count > 0;
    }

    public IReadOnlyCollection<int> GetOnlineUserIds()
    {
        return _onlineUsers
            .Where(kv => kv.Value.Count > 0)
            .Select(kv => kv.Key)
            .ToList()
            .AsReadOnly();
    }

    public bool AddConnection(int userId, string connectionId)
    {
        var justBecameOnline = false;

        _onlineUsers.AddOrUpdate(
            userId,
            _ =>
            {
                justBecameOnline = true;
                return new HashSet<string> { connectionId };
            },
            (_, connections) =>
            {
                lock (connections)
                {
                    if (connections.Count == 0)
                    {
                        justBecameOnline = true;
                    }
                    connections.Add(connectionId);
                }
                return connections;
            });

        return justBecameOnline;
    }

    public bool RemoveConnection(int userId, string connectionId)
    {
        var justBecameOffline = false;

        if (_onlineUsers.TryGetValue(userId, out var connections))
        {
            lock (connections)
            {
                connections.Remove(connectionId);
                if (connections.Count == 0)
                {
                    justBecameOffline = true;
                }
            }

            if (justBecameOffline)
            {
                _onlineUsers.TryRemove(userId, out _);
            }
        }

        return justBecameOffline;
    }
}
