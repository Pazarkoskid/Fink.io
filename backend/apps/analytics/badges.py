"""
Dynamic badge / achievement calculation.

Many badges across multiple categories:
  - Solver (count of attempts)
  - Scholar (average score tiers)
  - Champion (total points)
  - Streak (consecutive days)
  - Creator (instructor: published quizzes)
  - Loved (instructor: total likes received)
  - Perfectionist (count of 100% scores)
  - Engaged (likes given, saved quizzes)
  - Special: role, welcome, milestones, daily counts, etc.
"""
from dataclasses import dataclass, asdict
from typing import List


@dataclass
class Badge:
    key: str
    label: str
    description: str
    icon: str
    tier: str  # bronze | silver | gold | diamond
    unlocked: bool = True
    progress: int = 100

    def to_dict(self):
        return asdict(self)


def _tier_for(value, thresholds_list):
    """Return (tier, threshold, label_suffix) for the best achieved tier, or None."""
    for tier, t_val, suffix in thresholds_list:
        if value >= t_val:
            return tier, t_val, suffix
    return None


def _tiered(key_prefix, label_base, icon, desc_template, value, thresholds):
    """
    thresholds: [(tier, threshold, label_suffix), ...] from highest to lowest.
    Returns the best tier as Badge, plus progress toward next tier if not at top.
    """
    achieved = _tier_for(value, thresholds)
    if achieved:
        tier, t_val, suffix = achieved
        return Badge(
            key=f'{key_prefix}_{tier}',
            label=f'{label_base} {suffix}'.strip(),
            description=desc_template.format(value=t_val),
            icon=icon,
            tier=tier,
            unlocked=True,
        )
    # Not at bronze yet - return locked bronze
    lowest = thresholds[-1]
    tier, t_val, suffix = lowest
    return Badge(
        key=f'{key_prefix}_{tier}',
        label=f'{label_base} {suffix}'.strip(),
        description=desc_template.format(value=t_val),
        icon=icon,
        tier=tier,
        unlocked=False,
        progress=min(100, int(value / max(1, t_val) * 100)),
    )


def calculate_badges(stats, user) -> List[Badge]:
    """Return all relevant badges for the user (unlocked + in progress)."""
    badges = []

    # --- 1. Solver (number of quizzes played) ---
    badges.append(_tiered(
        'solver', 'Решавач', '🎯',
        'Реши {value} квизови',
        stats.total_attempts,
        [
            ('diamond', 1000, 'Легенда'),
            ('gold',    250,  'Експерт'),
            ('silver',  50,   'Напреден'),
            ('bronze',  5,    'Почетник'),
        ],
    ))

    # --- 2. Scholar (average score, requires min 5 attempts) ---
    if stats.total_attempts >= 5:
        avg = stats.average_score or 0
        if avg >= 95:
            badges.append(Badge('scholar_diamond', 'Совршен ученик',
                'Просечен скор над 95%', '⭐', 'diamond'))
        elif avg >= 85:
            badges.append(Badge('scholar_gold', 'Одличен ученик',
                'Просечен скор над 85%', '🌟', 'gold'))
        elif avg >= 70:
            badges.append(Badge('scholar_silver', 'Добар ученик',
                'Просечен скор над 70%', '✨', 'silver'))
        elif avg >= 50:
            badges.append(Badge('scholar_bronze', 'Ученик',
                'Просечен скор над 50%', '💫', 'bronze'))
        else:
            badges.append(Badge('scholar_bronze', 'Ученик',
                'Достигни просечен скор над 50%', '💫', 'bronze',
                unlocked=False, progress=int(avg / 50 * 100)))

    # --- 3. Champion (total points) ---
    badges.append(_tiered(
        'champion', 'Шампион', '🏆',
        'Заработи {value} поени',
        stats.total_points,
        [
            ('diamond', 10000, 'Легенда'),
            ('gold',    2500,  'Златен'),
            ('silver',  500,   'Сребрен'),
            ('bronze',  50,    ''),
        ],
    ))

    # --- 4. Streak (consecutive days) ---
    badges.append(_tiered(
        'streak', 'Серија', '🔥',
        'Играј {value} денови по ред',
        stats.longest_streak,
        [
            ('diamond', 100, 'Легенда'),
            ('gold',    30,  'Месец'),
            ('silver',  7,   'Недела'),
            ('bronze',  3,   ''),
        ],
    ))

    # --- 5. Perfect score (best_score == 100) ---
    if stats.best_score >= 100:
        badges.append(Badge(
            'perfect_score', 'Совршен резултат',
            '100% на еден квиз', '💯', 'gold',
        ))
    else:
        badges.append(Badge(
            'perfect_score', 'Совршен резултат',
            'Постигни 100% на еден квиз', '💯', 'gold',
            unlocked=False,
            progress=int((stats.best_score or 0)),
        ))

    # --- 6. Knowledge (total questions answered correctly) ---
    badges.append(_tiered(
        'knowledge', 'Знаење', '📚',
        '{value} точни одговори',
        stats.total_correct,
        [
            ('diamond', 5000, 'Енциклопедија'),
            ('gold',    1000, 'Експерт'),
            ('silver',  200,  'Знаечки'),
            ('bronze',  20,   ''),
        ],
    ))

    # --- 7. Creator (instructor only: published quizzes) ---
    if user.is_instructor:
        badges.append(_tiered(
            'creator', 'Креатор', '✍️',
            'Создаде {value} квизови',
            stats.quizzes_authored,
            [
                ('diamond', 100, 'Мастер'),
                ('gold',    25,  'Златен'),
                ('silver',  10,  'Сребрен'),
                ('bronze',  1,   ''),
            ],
        ))

        # --- 8. Loved (likes received on quizzes) ---
        badges.append(_tiered(
            'loved', 'Омилен', '❤️',
            'Доби {value} лајкови',
            stats.likes_received,
            [
                ('diamond', 500, 'Идол'),
                ('gold',    100, 'Звезда'),
                ('silver',  25,  'Популарен'),
                ('bronze',  5,   ''),
            ],
        ))

    # --- 9. Role badge (always shown for non-student) ---
    role_badges = {
        'admin':     ('Администратор', 'Управува со платформата', '👑', 'diamond'),
        'moderator': ('Модератор', 'Грижи се за квалитетот', '🛡️', 'gold'),
        'instructor':('Инструктор', 'Создава едукативни квизови', '🎓', 'silver'),
    }
    if user.role in role_badges:
        label, desc, icon, tier = role_badges[user.role]
        badges.append(Badge(f'role_{user.role}', label, desc, icon, tier))

    # --- 10. Welcome (always for registered users) ---
    badges.append(Badge(
        'welcome', 'Добредојде',
        'Регистриран член на Fink.io',
        '👋', 'bronze',
    ))

    # --- 11. Early bird (member for X days) ---
    if user.created_at:
        from django.utils import timezone
        days_member = (timezone.now() - user.created_at).days
        badges.append(_tiered(
            'veteran', 'Ветеран', '⏳',
            'Член {value} денови',
            days_member,
            [
                ('diamond', 365, 'Година'),
                ('gold',    180, 'Половина година'),
                ('silver',  90,  'Тромесечје'),
                ('bronze',  30,  'Месец'),
            ],
        ))

    # --- 12. Marathoner (best_score combined with attempts) ---
    if stats.total_attempts >= 100 and stats.average_score >= 70:
        badges.append(Badge(
            'marathoner', 'Маратонец',
            '100+ квизови со просек над 70%',
            '🏃', 'gold',
        ))

    # --- 13. Consistency (longest streak >= 14) ---
    if stats.longest_streak >= 14:
        badges.append(Badge(
            'consistency', 'Доследен',
            'Серија од 14+ денови',
            '📅', 'silver',
        ))

    # --- 14. Speed runner (placeholder for future, locked) ---
    badges.append(Badge(
        'speed_runner', 'Брз решавач',
        'Реши квиз од 10 прашања под 2 минути (наскоро)',
        '⚡', 'gold',
        unlocked=False, progress=0,
    ))

    return badges
