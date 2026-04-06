package com.djngoma.devilsaidictionary

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

@Composable
fun NativeScreenCard(
    colors: NativeColors,
    modifier: Modifier = Modifier,
    emphasis: Boolean = false,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val interactiveModifier =
        if (onClick != null) {
            modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
        } else {
            modifier.fillMaxWidth()
        }

    Card(
        modifier = interactiveModifier,
        colors = CardDefaults.cardColors(
            containerColor = if (emphasis) colors.surfaceStrong else colors.surface,
        ),
        border = BorderStroke(1.dp, colors.border.copy(alpha = 0.95f)),
        shape = MaterialTheme.shapes.large,
    ) {
        Column(
            modifier = Modifier.padding(NativeLayout.pagePadding),
            verticalArrangement = Arrangement.spacedBy(NativeLayout.cardGap),
            content = content,
        )
    }
}

@Composable
fun NativeCard(
    colors: NativeColors,
    modifier: Modifier = Modifier,
    emphasis: Boolean = false,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    NativeScreenCard(
        colors = colors,
        modifier = modifier,
        emphasis = emphasis,
        onClick = onClick,
        content = content,
    )
}

@Composable
fun SectionLabel(text: String) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
fun NativePrimaryButton(
    label: String,
    colors: NativeColors,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    leadingIcon: ImageVector? = null,
) {
    Button(
        onClick = onClick,
        modifier = modifier.heightIn(min = NativeLayout.controlMinHeight),
        shape = MaterialTheme.shapes.small,
        colors = ButtonDefaults.buttonColors(
            containerColor = colors.accent,
            contentColor = Color.White,
        ),
    ) {
        if (leadingIcon != null) {
            androidx.compose.material3.Icon(
                imageVector = leadingIcon,
                contentDescription = null,
            )
            Spacer(modifier = Modifier.width(8.dp))
        }
        Text(label)
    }
}

@Composable
fun NativeSecondaryButton(
    label: String,
    colors: NativeColors,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    leadingIcon: ImageVector? = null,
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.heightIn(min = NativeLayout.controlMinHeight),
        shape = MaterialTheme.shapes.small,
        border = BorderStroke(1.dp, colors.border),
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = MaterialTheme.colorScheme.onSurface,
        ),
    ) {
        if (leadingIcon != null) {
            androidx.compose.material3.Icon(
                imageVector = leadingIcon,
                contentDescription = null,
            )
            Spacer(modifier = Modifier.width(8.dp))
        }
        Text(label)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun NativeActionRow(
    content: @Composable () -> Unit,
) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        content = { content() },
    )
}

@Composable
fun NativeChip(
    label: String,
    colors: NativeColors,
    selected: Boolean = false,
    accent: Boolean = false,
    onClick: (() -> Unit)? = null,
) {
    val containerColor =
        when {
            selected -> colors.accentMuted
            accent -> colors.surfaceStrong
            else -> colors.surfaceMuted
        }
    val textColor =
        when {
            selected || accent -> colors.accent
            else -> MaterialTheme.colorScheme.onSurfaceVariant
        }

    Surface(
        modifier = if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier,
        color = containerColor,
        border = BorderStroke(
            1.dp,
            if (selected) colors.accent.copy(alpha = 0.35f) else colors.border.copy(alpha = 0.8f),
        ),
        shape = MaterialTheme.shapes.extraLarge,
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            style = MaterialTheme.typography.labelLarge,
            color = textColor,
        )
    }
}

@Composable
fun EntryCard(
    entry: Entry,
    colors: NativeColors,
    compact: Boolean = false,
    onClick: () -> Unit,
) {
    NativeScreenCard(
        colors = colors,
        onClick = onClick,
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            NativeChip(
                label = entry.letter,
                colors = colors,
                accent = true,
            )
        }
        Text(
            text = entry.title,
            style = if (compact) {
                MaterialTheme.typography.titleLarge
            } else {
                MaterialTheme.typography.headlineMedium
            },
        )
        Text(
            text = entry.devilDefinition.trim(),
            maxLines = if (compact) 3 else 5,
            overflow = TextOverflow.Ellipsis,
            style = MaterialTheme.typography.bodyLarge,
        )
        Text(
            text = entry.plainDefinition.trim(),
            maxLines = if (compact) 3 else 4,
            overflow = TextOverflow.Ellipsis,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}

@Composable
fun WarningCard(
    text: String,
    colors: NativeColors,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = colors.warning.copy(alpha = 0.14f),
        shape = MaterialTheme.shapes.large,
        border = BorderStroke(1.dp, colors.warning.copy(alpha = 0.24f)),
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(14.dp),
            color = colors.warning,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}

@Composable
fun NativeEmptyState(
    title: String,
    body: String,
    colors: NativeColors,
    primaryLabel: String,
    onPrimary: () -> Unit,
    secondaryLabel: String? = null,
    onSecondary: (() -> Unit)? = null,
) {
    NativeScreenCard(colors = colors, emphasis = true) {
        Text(
            text = title,
            style = MaterialTheme.typography.headlineMedium,
        )
        Text(
            text = body,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
        )
        NativeActionRow {
            NativePrimaryButton(
                label = primaryLabel,
                colors = colors,
                onClick = onPrimary,
            )
            if (secondaryLabel != null && onSecondary != null) {
                NativeSecondaryButton(
                    label = secondaryLabel,
                    colors = colors,
                    onClick = onSecondary,
                )
            }
        }
    }
}

@Composable
fun EmptyStateCard(
    title: String,
    body: String,
    colors: NativeColors,
    primaryLabel: String,
    onPrimary: () -> Unit,
    secondaryLabel: String? = null,
    onSecondary: (() -> Unit)? = null,
) {
    NativeEmptyState(
        title = title,
        body = body,
        colors = colors,
        primaryLabel = primaryLabel,
        onPrimary = onPrimary,
        secondaryLabel = secondaryLabel,
        onSecondary = onSecondary,
    )
}

@Composable
fun CategoryGrid(
    categories: List<CategoryStat>,
    colors: NativeColors,
    onClick: (CategoryStat) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        categories.forEach { category ->
            NativeScreenCard(
                colors = colors,
                onClick = { onClick(category) },
            ) {
                Text(
                    text = category.title,
                    style = MaterialTheme.typography.titleLarge,
                )
                Text(
                    text = category.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = "${category.count} terms",
                    color = colors.accent,
                    style = MaterialTheme.typography.labelLarge,
                )
            }
        }
    }
}

@Composable
fun <T> SimpleDropdown(
    label: String,
    value: String,
    options: List<Pair<String, T?>>,
    onSelected: (T?) -> Unit,
) {
    var expanded by remember(label, value) { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Box {
            OutlinedButton(
                onClick = { expanded = true },
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.small,
            ) {
                Text(
                    text = value,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
            ) {
                options.forEach { (optionLabel, optionValue) ->
                    DropdownMenuItem(
                        text = { Text(optionLabel) },
                        onClick = {
                            expanded = false
                            onSelected(optionValue)
                        },
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NativeFilterSheet(
    title: String,
    colors: NativeColors,
    onDismiss: () -> Unit,
    content: @Composable ColumnScope.() -> Unit,
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = colors.surface,
        contentColor = MaterialTheme.colorScheme.onSurface,
        modifier = Modifier.testTag(NativeUiTags.SearchFilterSheet),
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(top = 12.dp)
                    .background(colors.border, MaterialTheme.shapes.extraLarge)
                    .width(54.dp)
                    .height(4.dp),
            )
        },
    ) {
        LazyColumn(
            modifier = Modifier
                .navigationBarsPadding()
                .imePadding(),
            contentPadding = PaddingValues(
                start = NativeLayout.pagePadding,
                top = 12.dp,
                end = NativeLayout.pagePadding,
                bottom = 24.dp,
            ),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SectionLabel(text = title)
                    Text(
                        text = title,
                        style = MaterialTheme.typography.headlineMedium,
                    )
                }
            }
            item {
                Column(
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    content = content,
                )
            }
        }
    }
}

fun mainScreenPadding(padding: PaddingValues): PaddingValues =
    PaddingValues(
        start = NativeLayout.pagePadding,
        top = padding.calculateTopPadding() + 12.dp,
        end = NativeLayout.pagePadding,
        bottom = padding.calculateBottomPadding() + 24.dp,
    )

fun overlayPadding(padding: PaddingValues): PaddingValues =
    PaddingValues(
        start = NativeLayout.pagePadding,
        top = padding.calculateTopPadding() + 12.dp,
        end = NativeLayout.pagePadding,
        bottom = padding.calculateBottomPadding() + 24.dp,
    )

fun difficultyLabel(value: Difficulty): String =
    when (value) {
        Difficulty.beginner -> "Beginner"
        Difficulty.intermediate -> "Intermediate"
        Difficulty.advanced -> "Advanced"
    }

fun technicalDepthLabel(value: TechnicalDepth): String =
    when (value) {
        TechnicalDepth.low -> "Light"
        TechnicalDepth.medium -> "Practical"
        TechnicalDepth.high -> "Deep"
    }

fun vendorFilterLabel(value: VendorFilter): String =
    when (value) {
        VendorFilter.all -> "All terms"
        VendorFilter.vendorOnly -> "Vendor terms only"
        VendorFilter.nonVendorOnly -> "Non-vendor terms"
    }
