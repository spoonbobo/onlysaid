import { useColorModeValue } from "@/components/ui/color-mode";
import { useColorMode } from "@/components/ui/color-mode";
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';

// Chat room list colors
export const useChatRoomColors = () => {
    return {
        bgSubtle: useColorModeValue("bg.subtle", "gray.800"),
        textColor: useColorModeValue("gray.600", "gray.400"),
        textColorHeading: useColorModeValue("gray.800", "gray.100"),
        borderColor: useColorModeValue("gray.200", "gray.700"),
        selectedRoomBg: useColorModeValue("blue.50", "blue.900"),
        selectedRoomBorder: useColorModeValue("blue.300", "blue.600"),
        roomHoverBg: useColorModeValue("gray.50", "gray.700"),
        buttonHoverBg: useColorModeValue("gray.300", "gray.600"),
        buttonActiveBg: useColorModeValue("gray.400", "gray.500"),
    };
};

// Settings page colors
export const useSettingsColors = () => {
    const { colorMode } = useColorMode();
    const isDarkMode = colorMode === "dark";

    return {
        accentColor: "blue.500",
        bgColor: useColorModeValue("bg.subtle", "gray.800"),
        borderColor: useColorModeValue("gray.200", "gray.700"),
        hoverBg: useColorModeValue("gray.50", "gray.700"),
        textColor: useColorModeValue("gray.800", "gray.100"),
        textColorMuted: useColorModeValue("gray.600", "gray.400"),
        cardBg: useColorModeValue("white", "gray.800"),
        dangerZoneBg: useColorModeValue("red.50", "red.900"),
        dangerZoneBorder: useColorModeValue("red.200", "red.700"),
        dangerZoneText: useColorModeValue("red.700", "red.200"),
        dangerZoneHeading: useColorModeValue("red.600", "red.300"),
        textColorHeading: useColorModeValue("gray.800", "gray.100"),
        statusSuccess: isDarkMode ? "green.500" : "green.500",
        statusRunning: isDarkMode ? "blue.500" : "blue.500",
        statusPending: isDarkMode ? "yellow.500" : "yellow.500",
        statusFailure: isDarkMode ? "red.500" : "red.500",
        selectedBorder: useColorModeValue("blue.300", "blue.600"),
        subtleSelectedItemBg: useColorModeValue("blue.50", "blue.900"),
        selectedBorderColor: useColorModeValue("blue.400", "blue.500"),
    };
};

// Admin panel colors
export const useAdminPanelColors = () => {
    return {
        accentColor: "blue.500",
        borderColor: useColorModeValue("gray.200", "gray.700"),
        hoverBg: useColorModeValue("gray.50", "gray.700"),
        textColor: useColorModeValue("gray.800", "gray.100"),
        cardBg: useColorModeValue("white", "gray.800"),
        textColorHeading: useColorModeValue("gray.800", "gray.100"),
        textColorStrong: useColorModeValue("gray.800", "gray.100"),
        textColorMuted: useColorModeValue("gray.600", "gray.400"),
        bgSubtle: useColorModeValue("gray.50", "gray.800"),
        tableHeaderBg: useColorModeValue("gray.50", "gray.800"),
        errorBg: useColorModeValue("red.50", "red.900"),
        errorText: useColorModeValue("red.500", "red.300"),
        emptyBg: useColorModeValue("gray.50", "gray.800"),
        paginationBg: useColorModeValue("gray.200", "gray.700"),
        paginationDisabledBg: useColorModeValue("gray.100", "gray.800"),
        paginationColor: useColorModeValue("gray.700", "gray.300"),
        paginationDisabledColor: useColorModeValue("gray.400", "gray.600"),
        refreshButtonHoverBg: useColorModeValue("gray.100", "gray.600"),
        inputBgColor: useColorModeValue("white", "gray.700"),
        inputBorderHoverColor: useColorModeValue("gray.300", "gray.600"),
    };
};

// Chat page colors
export const useChatPageColors = () => {
    return {
        textColor: useColorModeValue("gray.700", "gray.400"),
        textColorHeading: useColorModeValue("gray.800", "gray.100"),
        textColorSecondary: useColorModeValue("gray.600", "gray.500"),
        chatModeHeading: useColorModeValue("green.600", "green.400"),
        borderColor: useColorModeValue("gray.200", "gray.700"),
        bgSubtle: useColorModeValue("rgba(249, 250, 251, 0.8)", "rgba(26, 32, 44, 0.8)"),
        cardBg: useColorModeValue("white", "gray.800"),
        hoverBg: useColorModeValue("gray.50", "gray.700"),
        buttonHoverBg: useColorModeValue("gray.300", "gray.600"),
        buttonActiveBg: useColorModeValue("gray.400", "gray.500"),
        userBgTask: useColorModeValue("blue.500", "blue.600"),
        userBgChat: useColorModeValue("teal.500", "teal.600"),
        otherBgTask: useColorModeValue("gray.100", "gray.700"),
        otherBgChat: useColorModeValue("gray.100", "gray.700"),
        otherTextTask: useColorModeValue("gray.800", "gray.100"),
        otherTextChat: useColorModeValue("gray.800", "gray.200"),
        chatInputBg: useColorModeValue("rgba(240, 255, 244, 0.8)", "rgba(25, 45, 35, 0.8)"),
        chatInputButtonBg: useColorModeValue("green.600", "green.700"),
        chatInputButtonHoverBg: useColorModeValue("green.700", "green.600"),
        chatInputCancelHoverBg: useColorModeValue("red.600", "red.500"),
        emptyStateBg: useColorModeValue("rgba(245, 250, 248, 0.3)", "rgba(30, 40, 38, 0.3)"),
        emptyStateTextColor: useColorModeValue("teal.700", "teal.300"),
        emptyStateSubtleColor: useColorModeValue("teal.600", "teal.400"),
        aiNameColor: useColorModeValue("teal.600", "teal.400"),
        formTextColor: useColorModeValue("gray.700", "gray.400"),
        formButtonBg: useColorModeValue("gray.200", "gray.700"),
        formButtonHoverBg: useColorModeValue("gray.300", "gray.600"),
        formButtonActiveBg: useColorModeValue("gray.400", "gray.500"),
        formInputBg: useColorModeValue("white", "gray.700"),
        createButtonBg: useColorModeValue("blue.500", "blue.500"),
        createButtonHoverBg: useColorModeValue("blue.600", "blue.600"),
        createButtonActiveBg: useColorModeValue("blue.700", "blue.700"),
        messageTextColor: useColorModeValue("gray.700", "gray.400"),
        scrollbarTrackBg: useColorModeValue("#f1f1f1", "#2d3748"),
        scrollbarThumbBg: useColorModeValue("#c5c5c5", "#4a5568"),
        scrollbarThumbHoverBg: useColorModeValue("#a8a8a8", "#718096"),
        chatModeBg: useColorModeValue("rgba(245, 250, 248, 0.3)", "rgba(30, 40, 38, 0.3)"),
        chatModeBorder: useColorModeValue("gray.300", "gray.600"),
        chatModeColor: useColorModeValue("green.500", "green.500"),
        taskModeColor: useColorModeValue("blue.500", "blue.500"),
        taskModeHoverColor: useColorModeValue("blue.600", "blue.600"),
        chatModeHoverColor: useColorModeValue("green.600", "green.600"),
        selectedItemBg: useColorModeValue("blue.50", "blue.900"),
        dropdownBg: useColorModeValue("white", "gray.700"),
        dropdownText: useColorModeValue("gray.800", "gray.200"),
        dropdownHoverBg: useColorModeValue("gray.50", "gray.600"),
        dropdownSelectedBg: useColorModeValue("blue.50", "blue.800"),
        dropdownBorder: useColorModeValue("gray.200", "gray.600"),
        spinnerColor: useColorModeValue("blue.500", "blue.300"),

        // New plan section specific colors
        planSectionBg: useColorModeValue("rgba(245, 250, 255, 0.9)", "rgba(23, 32, 42, 0.9)"),
        planSectionHeaderBg: useColorModeValue("blue.50", "blue.900"),
        planSectionHeaderText: useColorModeValue("blue.700", "blue.200"),
        planSectionBorder: useColorModeValue("blue.100", "blue.800"),
        planSectionHoverShadow: useColorModeValue("0 4px 12px rgba(66, 153, 225, 0.15)", "0 4px 12px rgba(66, 153, 225, 0.3)"),
        planItemBg: useColorModeValue("white", "gray.750"),
        planItemHoverBg: useColorModeValue("blue.50", "blue.900"),
        planItemBorder: useColorModeValue("blue.100", "blue.700"),
        planItemSelectedBg: useColorModeValue("blue.100", "blue.800"),
        planItemSelectedBorder: useColorModeValue("blue.300", "blue.600"),
        planLabelText: useColorModeValue("blue.600", "blue.300"),
        planValueText: useColorModeValue("gray.700", "gray.300"),
    };
};

// Plans page colors
export const usePlansColors = () => {
    const colorMode = useColorMode();
    const mode = typeof colorMode === 'object' ? colorMode.colorMode : colorMode;
    const isDarkMode = mode === "dark";

    return {
        accentColor: "blue.500",
        bgColor: useColorModeValue("bg.subtle", "gray.800"),
        borderColor: useColorModeValue("gray.200", "gray.700"),
        borderColorSubtle: useColorModeValue("gray.100", "gray.750"),
        hoverBg: useColorModeValue("gray.50", "gray.700"),
        textColor: useColorModeValue("gray.600", "gray.400"),
        textColorHeading: useColorModeValue("gray.800", "gray.100"),
        textColorMuted: useColorModeValue("gray.400", "gray.500"),
        cardBg: useColorModeValue("white", "gray.700"),
        bgSubtle: useColorModeValue("gray.50", "gray.800"),
        selectedRoomBg: useColorModeValue("blue.50", "blue.900"),
        errorBg: useColorModeValue("red.50", "red.900"),
        errorText: useColorModeValue("red.500", "red.300"),
        emptyBg: useColorModeValue("gray.50", "gray.800"),
        planItemBg: useColorModeValue("white", "gray.700"),
        planItemHoverBg: useColorModeValue("blue.50", "gray.600"),
        planItemBorder: useColorModeValue("gray.200", "gray.600"),
        planItemSelectedBg: useColorModeValue("blue.100", "blue.900"),

        // Add all the color values that were previously in the component
        sidebarShadowColor: useColorModeValue("rgba(0,0,0,0.05)", "rgba(0,0,0,0.3)"),
        cardHoverBg: useColorModeValue("gray.50", "gray.750"),
        selectedItemBg: useColorModeValue("blue.50", "rgba(66, 153, 225, 0.15)"),
        timelineConnectorColor: useColorModeValue("gray.200", "gray.600"),
        detailsPanelBg: useColorModeValue("white", "gray.850"),
        timelineIconBg: useColorModeValue("blue.50", "blue.900"),
        timelineIconColor: useColorModeValue("blue.500", "blue.300"),
        timelineSelectedIconBg: useColorModeValue("blue.500", "blue.400"),
        timelineSelectedIconColor: useColorModeValue("white", "white"),
        accentGradient: useColorModeValue(
            "linear-gradient(to right, blue.400, blue.500)",
            "linear-gradient(to right, blue.400, blue.600)"
        ),
        selectedBorderColor: useColorModeValue("blue.400", "blue.500"),
        timelineBg: useColorModeValue("white", "gray.850"),
        detailsBg: useColorModeValue("gray.50", "gray.900"),
        cardShadow: useColorModeValue("0 2px 5px rgba(0,0,0,0.05)", "0 2px 5px rgba(0,0,0,0.3)"),
        selectedCardShadow: useColorModeValue("0 3px 8px rgba(0,0,0,0.08)", "0 3px 8px rgba(0,0,0,0.4)"),
        subtleSelectedItemBg: useColorModeValue("blue.50", "rgba(66, 153, 225, 0.2)"),
        subtleSelectedBorderColor: useColorModeValue("blue.200", "blue.600"),
        subtleTimelineSelectedIconBg: useColorModeValue("blue.400", "blue.500"),
        tableBgDark: useColorModeValue("white", "gray.800"),
        tableHeaderBgDark: useColorModeValue("gray.50", "gray.750"),
        monoBgDark: useColorModeValue("gray.50", "gray.800"),
        darkModeInputBg: useColorModeValue("white", "gray.700"),
        focusRingColor: useColorModeValue("blue.100", "blue.800"),
        buttonBgColor: useColorModeValue("white", "gray.800"),
        buttonHoverBgColor: useColorModeValue("red.50", "gray.700"),
        blueBgColor: useColorModeValue("blue.500", "blue.500"),
        blueHoverBgColor: useColorModeValue("blue.600", "blue.400"),

        // Adding missing properties
        inputBg: useColorModeValue("white", "gray.700"),
        inputBorder: useColorModeValue("gray.200", "gray.600"),
        selectedBorder: useColorModeValue("blue.300", "blue.600"),

        // Adding color properties for buttons and status indicators
        greenBgColor: useColorModeValue("green.500", "green.500"),
        greenHoverBgColor: useColorModeValue("green.600", "green.400"),
        orangeBgColor: useColorModeValue("orange.500", "orange.500"),
        orangeHoverBgColor: useColorModeValue("orange.600", "orange.400"),
        redBgColor: useColorModeValue("red.500", "red.500"),
        redHoverBgColor: useColorModeValue("red.600", "red.400"),

        // Status colors
        statusSuccess: isDarkMode ? "green.500" : "green.500",
        statusRunning: isDarkMode ? "blue.500" : "blue.500",
        statusPending: isDarkMode ? "yellow.500" : "yellow.500",
        statusTerminated: isDarkMode ? "red.400" : "red.400",
        statusFailure: isDarkMode ? "red.500" : "red.500",
        statusDefault: isDarkMode ? "gray.500" : "gray.500",
    };
};

// Code syntax highlighting colors
export const useCodeSyntaxHighlightColors = () => {
    return {
        codeStyle: useColorModeValue(oneLight, oneDark),
        codeBg: useColorModeValue("gray.50", "gray.800"),
        codeBorder: useColorModeValue("gray.200", "gray.700"),
        inlineCodeBg: useColorModeValue("gray.100", "gray.700"),
        inlineCodeColor: useColorModeValue("blue.600", "blue.300"),
    };
};

// Knowledge base colors
export const useKnowledgeBaseColors = () => {
    return {
        accentColor: "blue.500",
        bgColor: useColorModeValue("white", "gray.800"),
        borderColor: useColorModeValue("gray.200", "gray.700"),
        hoverBg: useColorModeValue("gray.50", "gray.700"),
        textColor: useColorModeValue("gray.600", "gray.400"),
        textColorStrong: useColorModeValue("gray.800", "gray.300"),
        textColorHeading: useColorModeValue("gray.900", "gray.100"),
        textColorMuted: useColorModeValue("gray.500", "gray.500"),
        cardBg: useColorModeValue("white", "gray.800"),
        cardBorderColor: useColorModeValue("gray.200", "gray.700"),
        buttonBg: useColorModeValue("gray.100", "gray.700"),
        buttonHoverBg: useColorModeValue("gray.200", "gray.600"),
        buttonActiveBg: useColorModeValue("gray.300", "gray.500"),
        itemHoverBg: useColorModeValue("gray.50", "gray.750"),
        inputBg: useColorModeValue("white", "gray.700"),
        inputBorder: useColorModeValue("gray.200", "gray.600"),
        inputFocusBorder: useColorModeValue("blue.500", "blue.300"),
        dialogBg: useColorModeValue("white", "gray.700"),
        statusEnabled: useColorModeValue("green.500", "green.400"),
        statusDisabled: useColorModeValue("red.500", "red.400"),
        dangerColor: useColorModeValue("red.600", "red.300"),
        emptyStateBg: useColorModeValue("gray.50", "gray.700"),
        scrollbarThumbColor: useColorModeValue("rgba(0,0,0,0.1)", "rgba(255,255,255,0.1)"),
        scrollbarThumbHoverColor: useColorModeValue("rgba(0,0,0,0.2)", "rgba(255,255,255,0.2)"),
        folderBg: useColorModeValue("gray.100", "gray.700"),
        folderActiveBg: useColorModeValue("blue.50", "blue.900"),
        folderActiveColor: useColorModeValue("blue.700", "blue.300"),
        categoryHeaderBg: useColorModeValue("gray.50", "gray.700"),
        selectedCategoryBg: useColorModeValue("blue.50", "blue.800"),
        selectedCategoryBorderColor: useColorModeValue("blue.500", "blue.300"),
        categoryHoverBg: useColorModeValue("gray.50", "gray.700"),
        cardHoverBorderColor: useColorModeValue("blue.300", "blue.300"),
        cardHeadingColor: useColorModeValue("blue.700", "blue.300"),
        loadingOverlayBg: useColorModeValue("rgba(255,255,255,0.9)", "rgba(26,32,44,0.9)"),
        accentBg: useColorModeValue("blue.500", "blue.500"),
        accentHoverBg: useColorModeValue("blue.600", "blue.400"),
    };
};

// Workbench colors
export const useWorkbenchColors = () => {
    const { colorMode } = useColorMode();
    const isDarkMode = colorMode === "dark";

    return {
        // Base colors
        accentColor: "blue.500",
        accentColorHover: useColorModeValue("blue.600", "blue.400"),
        bgColor: useColorModeValue("bg.subtle", "gray.800"),
        borderColor: useColorModeValue("gray.200", "gray.700"),
        hoverBg: useColorModeValue("gray.50", "gray.700"),

        // Text colors
        textColor: useColorModeValue("gray.700", "gray.300"),
        textColorHeading: useColorModeValue("gray.800", "gray.100"),
        textColorMuted: useColorModeValue("gray.600", "gray.400"),
        textColorStrong: useColorModeValue("gray.800", "gray.100"),

        // Card and container colors
        cardBg: useColorModeValue("white", "gray.800"),
        cardBorderColor: useColorModeValue("gray.200", "gray.700"),
        cardShadow: useColorModeValue("0 2px 5px rgba(0,0,0,0.05)", "0 2px 5px rgba(0,0,0,0.3)"),

        // File explorer specific
        fileIconColor: useColorModeValue("blue.500", "blue.300"),
        folderIconColor: "yellow.400",
        selectedItemBg: useColorModeValue("blue.50", "blue.900"),
        selectedItemBorder: useColorModeValue("blue.300", "blue.600"),
        fileTreeHoverBg: useColorModeValue("gray.50", "gray.700"),

        // Input and form elements
        inputBg: useColorModeValue("white", "gray.700"),
        inputBorder: useColorModeValue("gray.200", "gray.600"),
        inputFocusBorder: useColorModeValue("blue.500", "blue.300"),

        // Button colors
        buttonBg: useColorModeValue("gray.100", "gray.700"),
        buttonHoverBg: useColorModeValue("gray.200", "gray.600"),
        buttonActiveBg: useColorModeValue("gray.300", "gray.500"),

        // Action button colors
        primaryButtonBg: useColorModeValue("blue.500", "blue.500"),
        primaryButtonHoverBg: useColorModeValue("blue.600", "blue.400"),
        dangerButtonBg: useColorModeValue("red.500", "red.500"),
        dangerButtonHoverBg: useColorModeValue("red.600", "red.400"),

        // Dialog and modal colors
        dialogBg: useColorModeValue("white", "gray.800"),
        dialogBorderColor: useColorModeValue("gray.200", "gray.700"),

        // Status indicators
        loadingSpinnerColor: useColorModeValue("blue.500", "blue.300"),
        successColor: isDarkMode ? "green.500" : "green.500",
        errorColor: isDarkMode ? "red.500" : "red.500",
        warningColor: isDarkMode ? "yellow.500" : "yellow.500",

        // Gradients and special effects
        heroGradient: useColorModeValue(
            "linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%)",
            "linear-gradient(135deg, #2d3748 0%, #1a202c 100%)"
        ),

        // Code preview
        codePreviewBg: useColorModeValue("gray.50", "gray.800"),
        codePreviewBorder: useColorModeValue("gray.200", "gray.700"),

        // Empty state
        emptyStateBg: useColorModeValue("gray.50", "gray.700"),
        emptyStateIconColor: useColorModeValue("blue.500", "blue.300"),

        // Breadcrumb
        breadcrumbColor: useColorModeValue("gray.600", "gray.400"),
        breadcrumbActiveColor: useColorModeValue("blue.600", "blue.300"),
        breadcrumbSeparatorColor: useColorModeValue("gray.400", "gray.500"),

        // Scrollbar
        scrollbarTrackBg: useColorModeValue("#f1f1f1", "#2d3748"),
        scrollbarThumbBg: useColorModeValue("#c5c5c5", "#4a5568"),
        scrollbarThumbHoverBg: useColorModeValue("#a8a8a8", "#718096"),
    };
};

