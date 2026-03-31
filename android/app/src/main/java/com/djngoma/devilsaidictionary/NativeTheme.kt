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
            paper = Color(0xFFF5EFE5),
            surface = Color(0xFFFFFBF4),
            surfaceStrong = Color(0xFFF0E4D3),
            surfaceMuted = Color(0xFFF8F1E5),
            chrome = Color(0xFFF1E6D7),
            border = Color(0xFFD1BEAA),
            accent = Color(0xFFB35D39),
            accentMuted = Color(0xFFF3DED0),
            warning = Color(0xFFA24534),
            success = Color(0xFF2D6B55),
        )
        SiteTheme.codex -> NativeColors(
            paper = Color(0xFFF3F7FC),
            surface = Color(0xFFFEFFFF),
            surfaceStrong = Color(0xFFE5EEF8),
            surfaceMuted = Color(0xFFF7FBFF),
            chrome = Color(0xFFE9F1FA),
            border = Color(0xFFC5D5E8),
            accent = Color(0xFF1A67C4),
            accentMuted = Color(0xFFDCE8F7),
            warning = Color(0xFFCC4A42),
            success = Color(0xFF2A8058),
        )
        SiteTheme.absolutely -> NativeColors(
            paper = Color(0xFFF6F1EA),
            surface = Color(0xFFFCF8F1),
            surfaceStrong = Color(0xFFF1E6DA),
            surfaceMuted = Color(0xFFFFFBF6),
            chrome = Color(0xFFF0E4D7),
            border = Color(0xFFD8C9BA),
            accent = Color(0xFFBF6F54),
            accentMuted = Color(0xFFF6E2D6),
            warning = Color(0xFFCF5C45),
            success = Color(0xFF36744F),
        )
        SiteTheme.night -> NativeColors(
            paper = Color(0xFF12100D),
            surface = Color(0xFF1D1914),
            surfaceStrong = Color(0xFF26211A),
            surfaceMuted = Color(0xFF16130F),
            chrome = Color(0xFF1A1611),
            border = Color(0xFF4A3D36),
            accent = Color(0xFFE58A53),
            accentMuted = Color(0xFF68331B),
            warning = Color(0xFFF09A85),
            success = Color(0xFF63CBA7),
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
