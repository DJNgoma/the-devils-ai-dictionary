package com.djngoma.devilsaidictionary

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class NativeColors(
    val paper: Color,
    val surface: Color,
    val surfaceStrong: Color,
    val surfaceMuted: Color,
    val chrome: Color,
    val border: Color,
    val accent: Color,
    val accentMuted: Color,
    val warning: Color,
    val success: Color,
    val foregroundSoft: Color,
)

internal object NativeLayout {
    val pagePadding = 20.dp
    val sectionGap = 18.dp
    val cardGap = 14.dp
    val controlMinHeight = 52.dp
    val dockMinHeight = 68.dp
}

private fun themeColors(theme: SiteTheme): NativeColors =
    when (theme) {
        SiteTheme.book -> NativeColors(
            paper = Color(0xFFF4EFE6),
            surface = Color(0xFFFFFBF5),
            surfaceStrong = Color(0xFFEFE7DA),
            surfaceMuted = Color(0xFFF8F1E5),
            chrome = Color(0xFFF1E6D7),
            border = Color(0xFFD4C2B0),
            accent = Color(0xFFB2552F),
            accentMuted = Color(0xFFF7E0CF),
            warning = Color(0xFFA63B32),
            success = Color(0xFF26594A),
            foregroundSoft = Color(0xFF65584C),
        )
        SiteTheme.codex -> NativeColors(
            paper = Color(0xFFF3F8FD),
            surface = Color(0xFFFFFFFF),
            surfaceStrong = Color(0xFFE9F1F9),
            surfaceMuted = Color(0xFFF7FBFF),
            chrome = Color(0xFFE9F1FA),
            border = Color(0xFFC4D5E8),
            accent = Color(0xFF0169CC),
            accentMuted = Color(0xFFD6E8F5),
            warning = Color(0xFFE02E2A),
            success = Color(0xFF00A240),
            foregroundSoft = Color(0xFF516273),
        )
        SiteTheme.absolutely -> NativeColors(
            paper = Color(0xFFF6F3EE),
            surface = Color(0xFFF9F9F7),
            surfaceStrong = Color(0xFFF0ECE4),
            surfaceMuted = Color(0xFFFFFBF6),
            chrome = Color(0xFFF0E4D7),
            border = Color(0xFFDDD0C3),
            accent = Color(0xFFCC7D5E),
            accentMuted = Color(0xFFF5E2D6),
            warning = Color(0xFFFF5F38),
            success = Color(0xFF00C853),
            foregroundSoft = Color(0xFF6E685F),
        )
        SiteTheme.night -> NativeColors(
            paper = Color(0xFF12100D),
            surface = Color(0xFF1C1814),
            surfaceStrong = Color(0xFF211C17),
            surfaceMuted = Color(0xFF16130F),
            chrome = Color(0xFF1A1611),
            border = Color(0xFF4A3D38),
            accent = Color(0xFFE4864D),
            accentMuted = Color(0xFF663019),
            warning = Color(0xFFF08A7D),
            success = Color(0xFF5EC9A1),
            foregroundSoft = Color(0xFFB8A893),
        )
    }

private val BaseTypography = Typography()

internal val NativeTypography =
    Typography(
        headlineLarge = BaseTypography.headlineLarge.copy(
            fontFamily = FontFamily.Serif,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.8).sp,
            lineHeight = 40.sp,
        ),
        headlineMedium = BaseTypography.headlineMedium.copy(
            fontFamily = FontFamily.Serif,
            fontWeight = FontWeight.SemiBold,
            lineHeight = 34.sp,
        ),
        titleLarge = BaseTypography.titleLarge.copy(
            fontFamily = FontFamily.Serif,
            fontWeight = FontWeight.SemiBold,
            lineHeight = 28.sp,
        ),
        titleMedium = BaseTypography.titleMedium.copy(
            fontWeight = FontWeight.SemiBold,
        ),
        titleSmall = BaseTypography.titleSmall.copy(
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 1.1.sp,
        ),
        bodyLarge = BaseTypography.bodyLarge.copy(
            fontFamily = FontFamily.Serif,
            lineHeight = 28.sp,
        ),
        bodyMedium = BaseTypography.bodyMedium.copy(
            fontFamily = FontFamily.Serif,
            lineHeight = 24.sp,
        ),
        labelLarge = BaseTypography.labelLarge.copy(
            fontWeight = FontWeight.SemiBold,
        ),
        labelMedium = BaseTypography.labelMedium.copy(
            letterSpacing = 0.2.sp,
        ),
    )

@Composable
internal fun NativeAppTheme(
    theme: SiteTheme,
    content: @Composable (NativeColors) -> Unit,
) {
    val colors = remember(theme) { themeColors(theme) }
    val baseScheme = if (theme.isDark) darkColorScheme() else lightColorScheme()
    val colorScheme = baseScheme.copy(
        primary = colors.accent,
        secondary = colors.accent,
        tertiary = colors.success,
        background = colors.paper,
        surface = colors.surface,
        surfaceVariant = colors.surfaceStrong,
        onSurfaceVariant = colors.foregroundSoft,
        outline = colors.border,
        error = colors.warning,
    )

    MaterialTheme(
        colorScheme = colorScheme,
        typography = NativeTypography,
        shapes = Shapes(
            small = RoundedCornerShape(16.dp),
            medium = RoundedCornerShape(20.dp),
            large = RoundedCornerShape(24.dp),
            extraLarge = RoundedCornerShape(28.dp),
        ),
    ) {
        content(colors)
    }
}
