import React from "react";
import { Icon } from "@iconify/react";
import type { TaskRecord } from "@/types";
import { useI18n } from "@/i18n";

const buildResultUrl = (resultPath?: string | null) => {
  if (!resultPath) {
    return null;
  }
  if (/^https?:\/\//i.test(resultPath)) {
    return resultPath;
  }
  return resultPath.startsWith("/result")
    ? resultPath
    : `/result/${resultPath}/final.png`;
};

type Props = {
  tasks: TaskRecord[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void> | void;
  userId: string;
};

export const TaskHistory: React.FC<Props> = ({
  tasks,
  isLoading,
  error,
  onRefresh,
  userId,
}) => {
  const { t } = useI18n();

  const handleRefresh = () => {
    const maybePromise = onRefresh();
    if (maybePromise && typeof maybePromise.then === "function") {
      void maybePromise;
    }
  };

  const hasTasks = tasks.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {t("tasks.title")}
          </h3>
          <p className="text-xs text-gray-500">
            {t("tasks.currentUser", { userId: userId || t("tasks.anonymous") })}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon icon="carbon:renew" className="h-4 w-4" />
          {t("tasks.refresh")}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t("tasks.errorMessage", { message: error })}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Icon icon="eos-icons:three-dots-loading" className="h-4 w-4" />
          {t("tasks.loading")}
        </div>
      )}

      {!isLoading && !hasTasks && !error && (
        <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          {t("tasks.empty")}
        </div>
      )}

      {hasTasks && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-3 py-2">{t("tasks.status")}</th>
                <th className="px-3 py-2">{t("tasks.mode")}</th>
                <th className="px-3 py-2">{t("tasks.queue")}</th>
                <th className="px-3 py-2">{t("tasks.createdAt")}</th>
                <th className="px-3 py-2">{t("tasks.finishedAt")}</th>
                <th className="px-3 py-2">{t("tasks.result")}</th>
                <th className="px-3 py-2">{t("tasks.error")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white text-sm text-gray-700">
              {tasks.map((task) => {
                const resultLink = buildResultUrl(task.result_path);
                return (
                  <tr key={task.id} className="align-top">
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-700">
                        {task.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{task.mode ?? "-"}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {task.queue_position ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {task.created_at ? new Date(task.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {task.finished_at ? new Date(task.finished_at).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {resultLink ? (
                        <a
                          href={resultLink}
                          className="text-teal-600 hover:text-teal-700"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t("tasks.viewResult")}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-red-500">
                      {task.error ? task.error : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
