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
                <h3>No recurring tasks yet</h3>
                <p>Add a task once and it will appear on every day.</p>
                <button className="primary" onClick={()=>{setEditing(null);setFormOpen(true)}}><Plus size={18}/> Add task</button>
              </div>
            ) : (
              <div className="taskList">
                {visibleTasks.map(task => (
                  <article className={`task ${completedIds.has(task.id) ? "completed": ""}`} key={task.id}>
                    <button className={`check ${completedIds.has(task.id) ? "checked":"pending"}`} onClick={()=>toggleTask(task)} aria-label={completedIds.has(task.id) ? "Mark incomplete" : "Mark complete"}>
                      {completedIds.has(task.id) ? <Check size={19}/> : <Circle size={18}/>}
                    </button>
                    <div className="taskBody">
                      <h3>{task.title}</h3>
                      {task.notes && <p>{task.notes}</p>}
                      <div className="meta"><span className="blueText">Repeats daily</span>{completedIds.has(task.id) ? <span className="greenText">Completed for {selectedDate}</span> : <span>Pending for {selectedDate}</span>}</div>
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
    <form onSubmit={save}><label>Task<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} required placeholder="e.g. Finish project landing page"/></label><label>Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional details..."/></label><label>Start date<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label><p className="fieldHint">This task will appear every day. Completion is tracked separately for each date.</p>
    {error && <div className="error">{error}</div>}<div className="modalBtns"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>{busy?"Saving...":task?"Save changes":"Add task"}</button></div></form>
  </div></div>
}

export default App;
