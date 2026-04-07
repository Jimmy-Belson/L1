export const TodoModule = {
    items: [],

    async load(Core) {
        if (!Core.user) return;
        
        const { data, error } = await Core.sb.from('todo')
            .select('*')
            .eq('user_id', Core.user.id) 
            .order('id', { ascending: false });

        if (error) return console.error("TODO_LOAD_ERR:", error);
        
        const list = document.getElementById('todo-list');
        if (!list) return;

        list.innerHTML = ''; 
        this.items = data;

        const fragment = document.createDocumentFragment();
        data.forEach(t => fragment.appendChild(this.createTaskNode(t, Core)));
        list.appendChild(fragment);

        this.initDragLogic(list, Core);
    },

    createTaskNode(t, Core) {
        const d = document.createElement('div');
        d.className = `task ${t.is_completed ? 'completed' : ''}`;
        d.id = `task-${t.id}`;
        d.draggable = true; 

        const dateStr = t.deadline ? 
            `<span class="deadline-tag">[UNTIL: ${new Date(t.deadline).toLocaleDateString()}]</span>` : '';

        d.innerHTML = `
            <div class="task-drag-handle" style="cursor: grab;">::</div>
            <div class="task-content">
                <span class="task-text">> ${t.task.toUpperCase()}</span>
                ${dateStr}
            </div>
            <div class="task-status-icon"></div>
        `;

        d.ondragstart = (e) => {
            d.classList.add('dragging');
            e.dataTransfer.setData('text/plain', t.id);
        };

        d.ondragend = () => {
            d.classList.remove('dragging');
            Core.Msg("OBJECTIVE_REORDERED");
        };

        d.onclick = async (e) => {
            if (e.target.classList.contains('task-drag-handle')) return;
            const newState = !d.classList.contains('completed');
            d.classList.toggle('completed');
            await Core.sb.from('todo').update({ is_completed: newState }).eq('id', t.id);
        };

        d.oncontextmenu = async (ev) => {
            ev.preventDefault();
            const confirmed = await Core.CustomConfirm("ERASE_OBJECTIVE?");
            if (confirmed) {
                d.classList.add('removing-task'); 
                setTimeout(async () => {
                    const { error } = await Core.sb.from('todo').delete().eq('id', t.id);
                    if (!error) {
                        d.remove();
                        Core.Msg("OBJECTIVE_TERMINATED");
                    } else {
                        d.classList.remove('removing-task');
                    }
                }, 400);
            }
        };

        return d;
    },

    initDragLogic(list, Core) {
        list.addEventListener('dragover', e => {
            e.preventDefault();
            const dragging = document.querySelector('.dragging');
            const afterElement = this.getDragAfterElement(list, e.clientY);
            if (afterElement == null) {
                list.appendChild(dragging);
            } else {
                list.insertBefore(dragging, afterElement);
            }
        });
    },

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    render(t, Core) {
        const list = document.getElementById('todo-list'); 
        if (!list) return;
        list.prepend(this.createTaskNode(t, Core));
    },

    async add(val, date, Core) {
        if (!Core.user || !val) return;
        try {
            const { data, error } = await Core.sb.from('todo').insert([{ 
                task: val, 
                is_completed: false,
                user_id: Core.user.id,
                deadline: date || null
            }]).select();

            if (data && data[0]) {
                this.render(data[0], Core);
                Core.Msg("MISSION_ESTABLISHED", "info");
            }
        } catch (e) {
            Core.Msg("UPLINK_ERROR", "error");
        }
    }
};