import { Badge, Box, Flex, Icon, Text } from "@chakra-ui/react";
import { FaCheck, FaSync, FaClock, FaExclamationTriangle, FaStop } from "react-icons/fa";
import { PlanStatus, TaskStatus } from "@/types/plan";
import { useTranslations } from "next-intl";

type StatusType = PlanStatus | TaskStatus;

interface StatusBadgeProps {
    status: StatusType;
    showIcon?: boolean;
    size?: "sm" | "md" | "lg";
    variant?: "solid" | "subtle" | "outline";
    mr?: number | string;
}

// Helper function to get color scheme based on status
export const getStatusColorScheme = (status: StatusType): string => {
    switch (status) {
        case 'success': return 'green';      // good green
        case 'running': return 'blue';       // normal blue
        case 'failure': return 'orange';     // less red yellow
        case 'terminated': return 'purple';  // purple
        case 'denied': return 'red';         // red
        case 'pending': return 'yellow';     // light yellow
        case 'not_started': return 'gray';   // gray for not started
        default: return 'gray';
    }
};

// Custom color overrides for specific statuses
export const getCustomStatusColor = (status: StatusType, variant: "solid" | "subtle" | "outline"): Record<string, string> | undefined => {
    if (status === 'pending' && variant === 'solid') {
        // Lighter and brighter yellow for pending status
        return {
            bg: '#FFD700',  // A brighter gold/yellow
            textColor: '#000'  // Black text for better contrast on bright yellow
        };
    }
    return undefined;
};

// Helper function to get status icon
export const getStatusIcon = (status: StatusType) => {
    switch (status) {
        case 'success': return FaCheck;
        case 'running': return FaSync;
        case 'pending': return FaClock;
        case 'not_started': return FaClock;  // Clock icon for not started
        case 'failure': return FaExclamationTriangle;
        case 'denied': return FaExclamationTriangle;
        case 'terminated': return FaStop;
        default: return FaClock;
    }
};

const StatusBadge = ({ status, showIcon = false, size = "md", variant = "solid", ...props }: StatusBadgeProps & Record<string, any>) => {
    const colorScheme = getStatusColorScheme(status);
    const StatusIcon = getStatusIcon(status);
    const customColors = getCustomStatusColor(status, variant);
    const t = useTranslations("Plans");

    return (
        <Badge
            colorScheme={colorScheme}
            variant={variant}
            px={size === "sm" ? 1 : 2}
            py={size === "sm" ? 0 : 1}
            borderRadius="full"
            fontSize={size === "sm" ? "xs" : size === "md" ? "sm" : "md"}
            color={customColors?.textColor || (variant === "solid" ? "white" : `${colorScheme}.800`)}
            bg={customColors?.bg || (variant === "solid" ? `${colorScheme}.500` : undefined)}
            {...props}
        >
            <Flex align="center" gap={1}>
                {showIcon && <Icon as={StatusIcon} boxSize={size === "sm" ? 2 : 3} />}
                <Text>{t(status)}</Text>
            </Flex>
        </Badge>
    );
};

export default StatusBadge; 