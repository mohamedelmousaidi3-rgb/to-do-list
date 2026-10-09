import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Circle, LogIn, LogOut, Menu, Plus, Search, Trash2, UserRound, X
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib";

type Task = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  task_date: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type Completion = {
  id: string;
  task_id: string;
  user_id: string;
  completion_date: string;
  completed: boolean;
  completed_at: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayKey = dateKey(new Date());

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login"|"signup">("login");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [appError, setAppError] = useState("");
  const channelRef = useRef<any>(null);
  const loadedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAppError("Supabase is not configured yet. Add your project URL and publishable key to .env.local, then restart the app.");
      setLoading(false);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({data, error}) => {
      if (!active) return;
      if (error) { setAppError(error.message); setLoading(false); return; }
      setSession(data.session);
      if (data.session) loadUser(data.session.user.id);
      else setLoading(false);
    });

    const {data: listener} = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setMobileMenu(false);
      if (s) {
        if (loadedUserRef.current !== s.user.id) loadUser(s.user.id);
      } else {
        loadedUserRef.current = null;
        if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
        setTasks([]); setCompletions([]); setProfile(null); setLoading(false);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  async function loadUser(uid: string) {
    setLoading(true);
    setAppError("");
    const [{data: p, error: profileError}, {data: t, error: taskError}, {data: c, error: completionError}] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("tasks").select("*").eq("user_id", uid).order("created_at", {ascending:false}),
      supabase.from("task_completions").select("*").eq("user_id", uid)
