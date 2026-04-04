package com.djngoma.devilsaidictionary

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.layout.offset
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
    isDark: Boolean,
    onFinished: () -> Unit,
) {
    val backgroundColor = if (isDark) Color(0xFF12100D) else Color(0xFFF4EFE6)
    val textColor = if (isDark) Color(0xFFF4EFE6) else Color(0xFF140904)

    var logoVisible by remember { mutableStateOf(false) }
    var titleVisible by remember { mutableStateOf(false) }
    var dismissing by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        logoVisible = true
        delay(200)
        titleVisible = true
        delay(1300)
        dismissing = true
        delay(300)
        onFinished()
    }

    val logoAlpha by animateFloatAsState(
        targetValue = if (logoVisible && !dismissing) 1f else 0f,
        animationSpec = tween(300, easing = FastOutSlowInEasing),
        label = "logoAlpha",
    )
    val logoScaleVal by animateFloatAsState(
        targetValue = if (logoVisible) 1f else 0.8f,
        animationSpec = tween(300, easing = FastOutSlowInEasing),
        label = "logoScale",
    )

    val titleAlpha by animateFloatAsState(
        targetValue = if (titleVisible && !dismissing) 1f else 0f,
        animationSpec = tween(300, easing = FastOutSlowInEasing),
        label = "titleAlpha",
    )
    val titleOffsetY by animateDpAsState(
        targetValue = if (titleVisible) 0.dp else 12.dp,
        animationSpec = tween(300, easing = FastOutSlowInEasing),
        label = "titleOffset",
    )

    val overallAlpha by animateFloatAsState(
        targetValue = if (dismissing) 0f else 1f,
        animationSpec = tween(300, easing = FastOutSlowInEasing),
        label = "overallAlpha",
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .alpha(overallAlpha)
            .background(backgroundColor),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Image(
                painter = painterResource(R.mipmap.ic_launcher_round),
                contentDescription = null,
                modifier = Modifier
                    .size(120.dp)
                    .scale(logoScaleVal)
                    .alpha(logoAlpha),
            )
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "The Devil\u2019s AI Dictionary",
                fontSize = 22.sp,
                fontWeight = FontWeight.SemiBold,
                fontFamily = FontFamily.Serif,
                color = textColor,
                modifier = Modifier
                    .alpha(titleAlpha)
                    .offset(y = titleOffsetY),
            )
        }
    }
}
