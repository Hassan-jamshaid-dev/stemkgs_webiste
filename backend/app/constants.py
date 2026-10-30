"""Shared domain constants."""

SOCIETIES = frozenset(
    {
        "stem-society",
        "maths",
        "physics",
        "chemistry",
        "computer-science",
        "biology",
        "robotics",
        "astronomy",
        "crime",
    }
)

SESSION_COOKIE = "stem_cal_session"
CSRF_HEADER = "X-CSRF-Token"
SESSION_TTL_HOURS = 12
