namespace SkillBridge.Application.Common;

public class BusinessException : Exception
{
    public bool IsGraceWindow { get; init; }
    public BusinessException(string message) : base(message) { }
    public BusinessException(string message, bool isGraceWindow) : base(message)
    {
        IsGraceWindow = isGraceWindow;
    }
}