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
        if (_onlineUsers.TryGetValue(userId, out var connections))
        {
            lock (connections)
            {
                return connections.Count > 0;
            }
        }
        return false;
    }

    public IReadOnlyCollection<int> GetOnlineUserIds()
    {
        var result = new List<int>();
        foreach (var kv in _onlineUsers)
        {
            lock (kv.Value)
            {
                if (kv.Value.Count > 0)
                {
                    result.Add(kv.Key);
                }
            }
        }
        return result.AsReadOnly();
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
