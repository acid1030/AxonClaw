/**
 * 告警 Repository
 * 参考 AxonClawX internal/database/repo_alert.go
 */
export interface Alert {
    id: number;
    alert_id: string;
    risk: string;
    message: string;
    detail: string;
    notified: number;
    created_at: string;
}
export interface AlertFilter {
    page?: number;
    page_size?: number;
    risk?: string;
    start_time?: string;
    end_time?: string;
}
export interface AlertInsert {
    alert_id?: string;
    risk: string;
    message: string;
    detail?: string;
}
export declare function createAlert(alert: AlertInsert): number;
export declare function listAlerts(filter?: AlertFilter): {
    list: Alert[];
    total: number;
};
export declare function recentAlerts(limit: number): Alert[];
export declare function markAlertNotified(id: number): void;
export declare function markAllAlertsNotified(): void;
export declare function countUnreadAlerts(): number;
/** 告警汇总统计（AxonClawX 风格：高/中、1h/24h） */
export declare function alertSummaryStats(): {
    high: number;
    medium: number;
    count1h: number;
    count24h: number;
};
