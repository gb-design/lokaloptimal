import { useState } from "react";
import { actions } from "astro:actions";
import DashboardIcon from "./DashboardIcon";
import { DashboardDateField, DashboardSelect } from "./FormControls";
import {
  priorityLabels,
  projectStatusLabels,
  type LeadPriority,
  type ProjectStatus,
} from "../../lib/dashboard/types";
import { dateLabel, localDateTime, resultMessage } from "./action-utils";
import { calculateProjectProgress } from "../../lib/dashboard/insights";

type ProjectData = {
  id: number;
  status: ProjectStatus;
  target_date?: string | null;
  notes?: string | null;
};

type TaskData = {
  id: number;
  title: string;
  status: "offen" | "erledigt";
  priority: LeadPriority;
  due_at?: string | null;
};

export default function ProjectEditor({ project, tasks }: { project: ProjectData; tasks: TaskData[] }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [localTasks, setLocalTasks] = useState(tasks);
  const [taskPriority, setTaskPriority] = useState<LeadPriority>("mittel");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>(project.status);
  const [targetDate, setTargetDate] = useState(project.target_date || "");
  const taskProgress = calculateProjectProgress(localTasks);

  async function saveProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("project");
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const result = await actions.updateProject({
      id: project.id,
      status: data.status as ProjectStatus,
      targetDate: data.targetDate,
      notes: data.notes,
    });
    if (result.error) {
      setError(resultMessage(result));
      setBusy("");
      return;
    }
    window.location.reload();
  }

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("task");
    setError("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const result = await actions.createTask({
      projectId: project.id,
      title: data.title,
      priority: data.priority as LeadPriority,
      dueAt: data.dueAt,
    });
    if (result.error) {
      setError(resultMessage(result));
      setBusy("");
      return;
    }
    form.reset();
    setTaskPriority("mittel");
    setTaskDueAt("");
    window.location.reload();
  }

  async function toggleTask(task: TaskData) {
    const done = task.status !== "erledigt";
    setLocalTasks((current) => current.map((entry) => entry.id === task.id ? { ...entry, status: done ? "erledigt" : "offen" } : entry));
    const result = await actions.toggleTask({ id: task.id, done });
    if (result.error) {
      setLocalTasks((current) => current.map((entry) => entry.id === task.id ? task : entry));
      setError(resultMessage(result));
    }
  }

  return (
    <div className="dash-detail-grid">
      <section className="dash-panel">
        <div className="dash-panel-head">
          <div>
            <h2>Aufgaben</h2>
            <p>{taskProgress.open} offen · {taskProgress.completed} erledigt{taskProgress.overdue ? ` · ${taskProgress.overdue} überfällig` : ""}</p>
          </div>
        </div>
        {localTasks.length > 0 && (
          <div className="dash-progress" style={{ marginBottom: "1.25rem" }}>
            <div className="dash-progress-copy">
              <span>Aufgabenfortschritt</span>
              <strong>{taskProgress.completed}/{taskProgress.total} · {taskProgress.percent}%</strong>
            </div>
            <div
              className="dash-progress-track"
              role="progressbar"
              aria-label={`${taskProgress.completed} von ${taskProgress.total} Aufgaben erledigt`}
              aria-valuemin={0}
              aria-valuemax={localTasks.length}
              aria-valuenow={taskProgress.completed}
            >
              <span className="dash-progress-fill" style={{ "--progress": taskProgress.percent } as React.CSSProperties} />
            </div>
          </div>
        )}
        {localTasks.length ? (
          <div>
            {localTasks.map((task) => (
              <div className={`dash-task ${task.status === "erledigt" ? "done" : ""}`} key={task.id}>
                <button type="button" onClick={() => toggleTask(task)} aria-label={task.status === "erledigt" ? `${task.title} wieder öffnen` : `${task.title} erledigen`}>
                  <DashboardIcon name={task.status === "erledigt" ? "check" : "radio_button_unchecked"} size={18} />
                </button>
                <div className="dash-task-copy">
                  <span className="dash-task-title">{task.title}</span>
                  <small>{dateLabel(task.due_at)}</small>
                </div>
                <span className="dash-badge" data-tone={task.priority}>{priorityLabels[task.priority]}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="dash-empty">
            <DashboardIcon name="task_alt" size={28} />
            <strong>Noch keine Aufgaben</strong>
            <p>Fügen Sie den ersten konkreten Umsetzungsschritt hinzu.</p>
          </div>
        )}

        <form className="dash-form" onSubmit={createTask} style={{ marginTop: "2rem" }}>
          <div className="dash-form-grid">
            <div className="dash-field wide">
              <label htmlFor="task-title">Neue Aufgabe</label>
              <input id="task-title" name="title" required placeholder="z. B. Profilbeschreibung finalisieren" />
            </div>
            <DashboardSelect
              id="task-priority"
              label="Priorität"
              name="priority"
              value={taskPriority}
              options={Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))}
              onChange={(value) => setTaskPriority(value as LeadPriority)}
            />
            <DashboardDateField
              id="task-due"
              label="Fällig am"
              name="dueAt"
              value={taskDueAt}
              includeTime
              onChange={setTaskDueAt}
            />
          </div>
          <button className="dash-button secondary" type="submit" disabled={busy === "task"}>
            <DashboardIcon name={busy === "task" ? "progress_activity" : "add_task"} size={18} />
            Aufgabe hinzufügen
          </button>
        </form>
      </section>

      <aside className="dash-stack">
        <form className="dash-panel dash-form" onSubmit={saveProject}>
          <div className="dash-panel-head">
            <div>
              <h2>Projektsteuerung</h2>
              <p>Status, Zieltermin und interne Notizen.</p>
            </div>
          </div>
          <DashboardSelect
            id="project-status"
            label="Status"
            name="status"
            value={projectStatus}
            options={Object.entries(projectStatusLabels).map(([value, label]) => ({ value, label }))}
            onChange={(value) => setProjectStatus(value as ProjectStatus)}
          />
          <DashboardDateField
            id="project-target"
            label="Zieltermin"
            name="targetDate"
            value={targetDate}
            onChange={setTargetDate}
          />
          <div className="dash-field">
            <label htmlFor="project-notes">Notizen</label>
            <textarea id="project-notes" name="notes" defaultValue={project.notes || ""} />
            <small>Keine Passwörter oder Kundenzugänge speichern.</small>
          </div>
          <button className="dash-button" type="submit" disabled={busy === "project"}>
            <DashboardIcon name={busy === "project" ? "progress_activity" : "save"} size={18} />
            Projekt speichern
          </button>
        </form>
        {error && <div className="dash-feedback error" role="alert"><DashboardIcon name="error" size={18} />{error}</div>}
      </aside>
    </div>
  );
}
