import labelV3 from "@/assets/workboard/zamzam_label_v3.jpg";
import avatarKarin from "@/assets/workboard/avatar_karin.jpg";
import avatarMan from "@/assets/workboard/avatar_man.jpg";
import sultanEmblem from "@/assets/workboard/sultan_emblem.jpg";

export const images = { labelV3, avatarKarin, avatarMan, sultanEmblem };

export type TaskTone = "green" | "blue" | "yellow";
export type TaskStatus = "client" | "safe" | "deadline";
export type TaskTag = "FREELANCE" | "OFFICE" | "LAINNYA";

export type TimelineTask = {
  id: string;
  title: string;
  subtitle: string;
  avatar: string;
  tone: TaskTone;
  status: TaskStatus;
  tag: TaskTag;
  /** Larger title, as in the "Karin Hidayah Tour" cards. */
  bigTitle?: boolean;
};

export type TimelineGroup = { date: string; tasks: TimelineTask[] };

export type BoardColumn = { id: string; title: string; groups: TimelineGroup[] };

const groups = (prefix: string): TimelineGroup[] => [
  {
    date: "Nov 1, 2019",
    tasks: [
      {
        id: `${prefix}-1`,
        title: "Karin Hidayah Tour",
        subtitle: "Judul Task yang Harus Dikerjakan",
        avatar: avatarKarin,
        tone: "green",
        status: "client",
        tag: "FREELANCE",
        bigTitle: true,
      },
      {
        id: `${prefix}-2`,
        title: "Optimasi - Ops",
        subtitle: "Judul Task yang Harus Dikerjakan",
        avatar: avatarMan,
        tone: "blue",
        status: "safe",
        tag: "OFFICE",
        bigTitle: true,
      },
    ],
  },
  {
    date: "Nov 3, 2019",
    tasks: [
      {
        id: `${prefix}-3`,
        title: "Sultan Haramain Gresik",
        subtitle: "Judul Task yang Harus Dikerjakan",
        avatar: avatarMan,
        tone: "yellow",
        status: "deadline",
        tag: "LAINNYA",
      },
      {
        id: `${prefix}-4`,
        title: "Karin Hidayah Tour",
        subtitle: "Judul Task yang Harus Dikerjakan",
        avatar: avatarKarin,
        tone: "green",
        status: "client",
        tag: "FREELANCE",
        bigTitle: true,
      },
    ],
  },
];

export const boardColumns: BoardColumn[] = [
  { id: "pending", title: "TERTUNDA", groups: groups("pending") },
  { id: "progress", title: "ON PROSES", groups: groups("progress") },
  { id: "review", title: "REVIEW CLIENT", groups: groups("review") },
  { id: "done", title: "SELESAI", groups: groups("done") },
];

export type ChatMessage = {
  id: string;
  author: "Designer" | "Client";
  initials: string;
  time: string;
  text: string;
  pin?: number;
};

export const initialChat: ChatMessage[] = [
  {
    id: "m1",
    author: "Designer",
    initials: "DS",
    time: "10:45 AM",
    text: "Halo tim, preview V3 sudah saya unggah. Silakan direview, dan klik bagian gambar untuk menambahkan Pinpoint komentar revisi jika ada yang kurang sesuai.",
  },
  {
    id: "m2",
    author: "Client",
    initials: "CL",
    time: "Oct 18, 2026 - 10:45 AM",
    text: "Tolong perbesar logo klien di bagian ini.",
    pin: 1,
  },
  {
    id: "m3",
    author: "Client",
    initials: "CL",
    time: "Oct 18, 2026 - 11:10 AM",
    text: "Warna font agak kurang kontras dengan background. Mohon disesuaikan",
    pin: 2,
  },
];

export type WorkItem = {
  id: string;
  name: string;
  preview: string;
  time: string;
  initials: string;
  photo?: string;
  color: "red" | "pink" | "amber";
};

export const workItems: WorkItem[] = [
  {
    id: "w1",
    name: "Sid Vicious",
    preview: "At Creative Sparks Agency, we're rolling out a new brand system",
    time: "15.47",
    initials: "SV",
    photo: avatarMan,
    color: "red",
  },
  {
    id: "w2",
    name: "Cody Fisher",
    preview: "Exciting news! We've just launched our new campaign",
    time: "12.11",
    initials: "CD",
    color: "red",
  },
  {
    id: "w3",
    name: "Esther Howard",
    preview: "Our latest initiative focuses on sustainable packaging",
    time: "3 days",
    initials: "EH",
    color: "pink",
  },
  {
    id: "w4",
    name: "Kathryn Murphy",
    preview: "We're thrilled to announce the next design sprint",
    time: "3 days",
    initials: "KM",
    color: "amber",
  },
];
