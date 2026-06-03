export interface ContextItem {
  path: string;
  reason: string;
  priority: number;
}

export interface ContextPackage {
  taskId?: string | undefined;
  items: ContextItem[];
  stop: boolean;
  stopReason?: string | undefined;
}
