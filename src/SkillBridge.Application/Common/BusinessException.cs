namespace SkillBridge.Application.Common;

public class BusinessException : Exception
{
    public bool IsGraceWindow { get; init; }

    public BusinessException()
    {
    }

    public BusinessException(string message) : base(message)
    {
    }

    public BusinessException(string message, Exception innerException) : base(message, innerException)
    {
    }

    public BusinessException(string message, bool isGraceWindow) : base(message)
    {
        IsGraceWindow = isGraceWindow;
    }

    public BusinessException(string message, Exception innerException, bool isGraceWindow) : base(message, innerException)
    {
        IsGraceWindow = isGraceWindow;
    }
}