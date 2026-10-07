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
        setTasks([]); setProfile(null); setLoading(false);
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
    const [{data: p, error: profileError}, {data: t, error: taskError}] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("tasks").select("*").eq("user_id", uid).order("task_date", {ascending:true}).order("created_at", {ascending:false})
    ]);

    if (profileError || taskError) {
      setAppError(profileError?.message || taskError?.message || "Could not load your workspace.");
    }
    setProfile(p);
    setTasks(t || []);
    setLoading(false);
    loadedUserRef.current = uid;

    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase
      .channel(`tasks-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${uid}` }, (payload) => {
        const row = (payload.new || payload.old) as Task;
        if (payload.eventType === "INSERT") {
          setTasks(prev => prev.some(t => t.id === row.id) ? prev : [row, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setTasks(prev => prev.map(t => t.id === row.id ? row : t));
        } else if (payload.eventType === "DELETE") {
          setTasks(prev => prev.filter(t => t.id !== row.id));
        }
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") setAppError("Live updates are unavailable. Your tasks still work normally.");
      });
  }

  async function signOut() {
    const {error} = await supabase.auth.signOut();
    if (error) setAppError(error.message);
    else setMobileMenu(false);
  }

  const visibleTasks = useMemo(() => {
    return tasks.filter(t =>
      t.task_date === selectedDate &&
      (!search.trim() || t.title.toLowerCase().includes(search.toLowerCase()) ||
       (t.notes || "").toLowerCase().includes(search.toLowerCase()))
    );
  }, [tasks, selectedDate, search]);

  const dayTasks = tasks.filter(t => t.task_date === selectedDate);
  const done = dayTasks.filter(t => t.completed).length;
  const total = dayTasks.length;
  const progress = total ? Math.round(done / total * 100) : 0;

  const monthLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
    month:"long", year:"numeric"
  });

  async function toggleTask(task: Task) {
    const next = !task.completed;
    const {data, error} = await supabase.from("tasks").update({
      completed: next, completed_at: next ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }).eq("id", task.id).select().single();
    if (!error && data) setTasks(prev => prev.map(x => x.id === task.id ? data : x));
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    const {error} = await supabase.from("tasks").delete().eq("id", id);
    if (!error) setTasks(prev => prev.filter(t => t.id !== id));
  }

  function shiftDay(amount: number) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + amount);
    setSelectedDate(dateKey(d));
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark">✓</div>
          <div><strong>new~step</strong><span>to do list</span></div>
        </div>
        <button className="mobileBtn" onClick={() => setMobileMenu(v=>!v)}><Menu size={21}/></button>
        <div className={`topActions ${mobileMenu ? "show" : ""}`}>
          <div className="search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks..." /></div>
          {session ? (
            <div className="account">
              <div className="avatar">{(profile?.full_name || session.user.email || "U").slice(0,1).toUpperCase()}</div>
              <div className="accountText"><b>{profile?.full_name || "My account"}</b><small>{session.user.email}</small></div>
              <button className="iconBtn" title="Sign out" onClick={signOut}><LogOut size={17}/></button>
            </div>
          ) : <button className="primary small" onClick={()=>{setMobileMenu(false); if (!isSupabaseConfigured) setAppError("Connect Supabase first — see README.md for the setup steps."); else {setAuthMode("login");setAuthOpen(true)}}}><LogIn size={17}/> Sign in</button>}
        </div>
      </header>

      {appError && <div className="error appError">{appError}<button onClick={()=>setAppError("")} aria-label="Dismiss">×</button></div>}

      <main className="container">
        <section className="hero">
          <div>
            <p className="eyebrow">DAILY SYSTEM</p>
            <h1>Turn your day into <span>progress.</span></h1>
            <p className="sub">Create tasks, confirm what you actually completed, and let the day keep an honest record.</p>
          </div>
          <div className="heroStat"><span>{progress}%</span><small>{selectedDate === todayKey ? "today complete" : "day complete"}</small></div>
        </section>

        <section className="progressCard">
          <div className="progressTop">
            <div><span className="label">{selectedDate === todayKey ? "TODAY'S PROGRESS" : `${new Date(selectedDate+"T12:00:00").toLocaleDateString("en-US", {month:"short", day:"numeric"}).toUpperCase()} PROGRESS`}</span><b>{done} of {total} tasks completed</b></div>
            <div className="ring" style={{"--p": `${progress}%`} as any}><strong>{progress}%</strong></div>
          </div>
          <div className="bar"><span style={{width:`${progress}%`}}/></div>
          <div className="legend">
            <span><i className="dot green"/> Completed</span>
            <span><i className="dot blue"/> Pending</span>
            <span><i className="dot red"/> Missed after day ends</span>
          </div>
        </section>

        <section className="dateNav">
          <button className="squareBtn" onClick={()=>shiftDay(-1)}><ChevronLeft size={19}/></button>
          <div><CalendarDays size={19}/><b>{selectedDate === todayKey ? "Today" : new Date(selectedDate+"T12:00:00").toLocaleDateString("en-US",{weekday:"long"})}</b><span>{new Date(selectedDate+"T12:00:00").toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</span></div>
          <button className="squareBtn" onClick={()=>shiftDay(1)}><ChevronRight size={19}/></button>
          <button className="todayBtn" onClick={()=>setSelectedDate(todayKey)}>Today</button>
        </section>

        <section className="workspace">
          <div className="sectionHead">
            <div><span className="label">{monthLabel.toUpperCase()}</span><h2>Your tasks</h2></div>
            {session && <button className="primary" onClick={()=>{setEditing(null);setFormOpen(true)}}><Plus size={18}/> Add task</button>}
          </div>

          {!isSupabaseConfigured ? (
            <div className="empty loginEmpty">
              <div className="emptyIcon"><UserRound size={27}/></div>
              <h3>One setup step remains</h3>
              <p>Connect this app to Supabase by creating <code>.env.local</code> from <code>.env.example</code> and adding your project URL and publishable key.</p>
            </div>
          ) : !session ? (
            <div className="empty loginEmpty">
              <div className="emptyIcon"><UserRound size={27}/></div>
              <h3>Create your private workspace</h3>
              <p>Your tasks stay connected to your account across devices.</p>
              <button className="primary" onClick={()=>{setMobileMenu(false);setAuthMode("signup");setAuthOpen(true)}}>Create account</button>
            </div>
          ) : loading ? <div className="empty"><p>Loading your tasks...</p></div> :
            visibleTasks.length === 0 ? (
              <div className="empty">
                <div className="emptyIcon"><CheckCircle2 size={27}/></div>
                <h3>No tasks for this day</h3>
                <p>Add your first task and start the day with a clear plan.</p>
                <button className="primary" onClick={()=>{setEditing(null);setFormOpen(true)}}><Plus size={18}/> Add task</button>
              </div>
            ) : (
              <div className="taskList">
                {visibleTasks.map(task => (
                  <article className={`task ${task.completed ? "completed": ""}`} key={task.id}>
                    <button className={`check ${task.completed ? "checked":"pending"}`} onClick={()=>toggleTask(task)}>
                      {task.completed ? <Check size={19}/> : <Circle size={18}/>}
                    </button>
                    <div className="taskBody">
                      <h3>{task.title}</h3>
                      {task.notes && <p>{task.notes}</p>}
                      <div className="meta"><span className="blueText">{task.task_date}</span>{task.completed ? <span className="greenText">Completed</span> : task.task_date < todayKey ? <span className="redText">Missed</span> : <span>Pending</span>}</div>
                    </div>
                    <div className="taskActions">
                      <button className="iconBtn" onClick={()=>{setEditing(task);setFormOpen(true)}} title="Edit"><span>•••</span></button>
                      <button className="deleteBtn" onClick={()=>deleteTask(task.id)} title="Delete"><Trash2 size={17}/></button>
                    </div>
                  </article>
                ))}
              </div>
            )
          }
        </section>
      </main>

      {authOpen && <AuthModal mode={authMode} setMode={setAuthMode} onClose={()=>setAuthOpen(false)}/>}
      {formOpen && <TaskModal task={editing} defaultDate={selectedDate} onClose={()=>setFormOpen(false)} onSaved={(t)=>{setTasks(prev=>editing?prev.map(x=>x.id===t.id?t:x):[t,...prev]);setFormOpen(false)}}/>}
    </div>
  );
}

function AuthModal({mode,setMode,onClose}:{mode:"login"|"signup",setMode:(m:"login"|"signup")=>void,onClose:()=>void}) {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState(""); const [phone,setPhone]=useState("");
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  async function submit(e:any) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    if(mode==="signup") {
      const {data,error} = await supabase.auth.signUp({email,password,options:{data:{full_name:name,phone}}});
      if(error) setError(error.message);
      else if(data.user) {
        setMessage(data.session ? "Account created successfully." : "Account created. Check your email to confirm your account before signing in.");
      }
    } else {
      const {error} = await supabase.auth.signInWithPassword({email,password});
      if(error) setError(error.message); else onClose();
    }
    setBusy(false);
  }
  return <div className="modalBack"><div className="modal">
    <button className="close" onClick={onClose}><X/></button>
    <div className="modalLogo">✓</div><h2>{mode==="login"?"Welcome back":"Create your account"}</h2>
    <p className="modalSub">new~step: to do list</p>
    <form onSubmit={submit}>
      {mode==="signup" && <><label>Name<input value={name} onChange={e=>setName(e.target.value)} required placeholder="Your name"/></label><label>Phone<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+212 ..."/></label></>}
      <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label>
      <label>Password<input type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required placeholder="At least 6 characters"/></label>
      {error && <div className="error">{error}</div>}{message && <div className="success">{message}</div>}
      <button className="primary full" disabled={busy}>{busy?"Please wait...":mode==="login"?"Sign in":"Create account"}</button>
    </form>
    <button className="switch" onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");setMessage("")}}>{mode==="login"?"Need an account? Create one":"Already have an account? Sign in"}</button>
  </div></div>
}

function TaskModal({task,defaultDate,onClose,onSaved}:{task:Task|null,defaultDate:string,onClose:()=>void,onSaved:(t:Task)=>void}) {
  const [title,setTitle]=useState(task?.title||""); const [notes,setNotes]=useState(task?.notes||""); const [date,setDate]=useState(task?.task_date||defaultDate); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function save(e:any) {
    e.preventDefault(); if(!title.trim()) return; setBusy(true); setError("");
    const {data:user} = await supabase.auth.getUser(); if(!user.user){setError("Please sign in.");setBusy(false);return}
    const payload:any={title:title.trim(),notes:notes.trim()||null,task_date:date,updated_at:new Date().toISOString()};
    let result;
    if(task) result=await supabase.from("tasks").update(payload).eq("id",task.id).select().single();
    else result=await supabase.from("tasks").insert({...payload,user_id:user.user.id,completed:false}).select().single();
    if(result.error) setError(result.error.message); else onSaved(result.data);
    setBusy(false);
  }
  return <div className="modalBack"><div className="modal taskModal">
    <button className="close" onClick={onClose}><X/></button><h2>{task?"Edit task":"New task"}</h2><p className="modalSub">Plan it. Do it. Confirm it.</p>
    <form onSubmit={save}><label>Task<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} required placeholder="e.g. Finish project landing page"/></label><label>Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional details..."/></label><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label>
    {error && <div className="error">{error}</div>}<div className="modalBtns"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>{busy?"Saving...":task?"Save changes":"Add task"}</button></div></form>
  </div></div>
}

export default App;
