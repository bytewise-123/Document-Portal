document.addEventListener('DOMContentLoaded', () => {
    // --- UTILITIES & STATE ---
    const safeCreateIcons = () => { if (window.lucide) { try { lucide.createIcons(); } catch (e) { console.error(e); } } };
    
    let state = {
        currentUser: null, // { role: 'student'/'staff', name: '...' }
        requests: [],
    };

    // --- MOCK DATABASE ---
    const initialRequests = [
        {
            id: 101, requestType: "document_request", studentName: "xyz", rollNumber: "CS2025", docType: "Bonafide Certificate", purpose: "Passport application",
            status: "Action Required",
            supportingFiles: [{ name: "id_scan_101.png", url: "#" }],
            finalPDF: null,
            comments: [
                { by: "John (Staff)", text: "Please upload the fee payment receipt; current file is missing.", timestamp: "2025-10-05T11:00:00+05:30" }
            ],
            activityLog: [
                "2025-10-05 10:12 - xyz created request (Received)",
                "2025-10-05 10:20 - xyz uploaded id_scan_101.png (Submitted)",
                "2025-10-05 11:00 - John (Staff) commented: 'Please upload the fee payment receipt' (Action Required)"
            ]
        },
        {
            id: 102, requestType: "document_request", studentName: "Jane Doe", rollNumber: "EC2024", docType: "Official Transcript", purpose: "Higher studies application",
            status: "Ready",
            supportingFiles: [{ name: "application_form.pdf", url: "#" }, { name: "fee_receipt.pdf", url: "#" }],
            finalPDF: { name: "transcript_102_signed.pdf", url: "#" },
            comments: [
                { by: "John (Staff)", text: "All documents verified.", timestamp: "2025-10-06T14:00:00+05:30" }
            ],
            activityLog: [
                "2025-10-06 09:30 - Jane Doe created request (Received)",
                "2025-10-06 09:35 - Jane Doe uploaded 2 files (Submitted)",
                "2025-10-06 14:00 - John (Staff) started processing (Processing)",
                "2025-10-06 15:10 - John (Staff) generated PDF (Ready)"
            ]
        },
        {
            id: 103, requestType: "document_request", studentName: "xyz", rollNumber: "CS2025", docType: "Migration Certificate", purpose: "University transfer",
            status: "Submitted",
            supportingFiles: [{ name: "transfer_request.pdf", url: "#" }],
            finalPDF: null,
            comments: [],
            activityLog: [
                "2025-10-06 18:00 - xyz created request (Received)",
                "2025-10-06 18:05 - xyz uploaded transfer_request.pdf (Submitted)"
            ]
        },
        {
            id: 104, requestType: "verification_submission", studentName: "xyz", rollNumber: "CS2025",
            docType: "Internship Offer Letter",
            purpose: "For university credit.",
            status: "Processing",
            supportingFiles: [{ name: "offer_letter_acme.pdf", url: "#" }],
            finalPDF: null,
            comments: [{ by: "John (Staff)", text: "Document looks good. Forwarding to the academic department.", timestamp: "2025-10-06T10:00:00+05:30" }],
            activityLog: [
                "2025-10-06 09:00 -xyz submitted 'Internship Offer Letter' for verification (Submitted)",
                "2025-10-06 10:00 - John (Staff) started processing (Processing)"
            ]
        },
    ];

    // --- SIMPLIFIED INITIALIZATION ---
    // To ensure the prototype always works locally, we load the sample data directly into the state on every page load.
    // This means changes will NOT be saved when you refresh the page.
    state.requests = JSON.parse(JSON.stringify(initialRequests)); // Deep copy to prevent accidental mutation

    // --- DOM ELEMENTS ---
    const pages = {
        login: document.getElementById('login-page'),
        student: document.getElementById('student-portal'),
        staff: document.getElementById('staff-portal')
    };
    const modal = document.getElementById('request-modal');
    const modalContent = document.getElementById('modal-content');

    // --- TEMPLATING ---
    const getStatusClass = (status) => `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
    const formatDate = (dateStr) => new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    // --- RENDER FUNCTIONS ---
    const render = () => {
        document.body.classList.remove('overflow-hidden');
        Object.values(pages).forEach(p => p.classList.add('hidden'));
        modal.classList.add('hidden');

        if (!state.currentUser) {
            pages.login.classList.remove('hidden');
        } else if (state.currentUser.role === 'student') {
            pages.student.classList.remove('hidden');
            renderStudentDashboard();
        } else if (state.currentUser.role === 'staff') {
            pages.staff.classList.remove('hidden');
            renderStaffDashboard();
        }
        safeCreateIcons();
    };

    function renderStudentDashboard() {
        const listEl = document.getElementById('student-requests-list');
        const myRequests = state.requests.filter(r => r.rollNumber === "CS2025").sort((a,b) => b.id - a.id);
        if (myRequests.length === 0) {
            listEl.innerHTML = `<p class="text-slate-500 col-span-full text-center">You have no active requests. Click a button above to start.</p>`;
            return;
        }
        listEl.innerHTML = myRequests.map(req => `
            <div class="bg-white p-5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer" data-request-id="${req.id}">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold text-lg text-slate-800">${req.docType}</h3>
                        <p class="text-xs font-semibold uppercase tracking-wider ${req.requestType === 'verification_submission' ? 'text-green-600' : 'text-blue-600'}">${req.requestType.replace('_', ' ')}</p>
                    </div>
                    <span class="status-badge ${getStatusClass(req.status)}">${req.status}</span>
                </div>
                <p class="text-sm text-slate-500 mt-2">Request ID: ${req.id}</p>
                <p class="text-xs text-slate-400 mt-1">Last Update: ${formatDate(req.activityLog.slice(-1)[0].split(' - ')[0])}</p>
                <div class="mt-4 pt-4 border-t border-slate-200">
                    <p class="text-sm font-medium text-slate-600">Next Step:</p>
                    <p class="text-sm text-slate-500">${getStudentNextStep(req.status)}</p>
                </div>
            </div>
        `).join('');
    }
    
    function renderStaffDashboard() {
        const tbodyEl = document.getElementById('staff-requests-tbody');
        const allRequests = [...state.requests].sort((a,b) => b.id - a.id);
        if(allRequests.length === 0) {
            tbodyEl.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-slate-500">No requests found.</td></tr>`;
            return;
        }
        tbodyEl.innerHTML = allRequests.map(req => `
            <tr class="bg-white border-b hover:bg-gray-50">
                <td class="px-6 py-4 font-medium text-gray-900">${req.id}</td>
                <td class="px-6 py-4">${req.studentName} (${req.rollNumber})</td>
                <td class="px-6 py-4">
                    <span class="font-medium">${req.docType}</span><br>
                    <span class="text-xs uppercase font-semibold ${req.requestType === 'verification_submission' ? 'text-green-700' : 'text-blue-700'}">${req.requestType.replace('_', ' ')}</span>
                </td>
                <td class="px-6 py-4"><span class="status-badge ${getStatusClass(req.status)}">${req.status}</span></td>
                <td class="px-6 py-4">${formatDate(req.activityLog.slice(-1)[0].split(' - ')[0])}</td>
                <td class="px-6 py-4"><button class="font-medium text-blue-600 hover:underline" data-request-id="${req.id}">Review</button></td>
            </tr>
        `).join('');
    }

    function renderModal(requestId = null) {
        if (requestId === 'new') {
            modalContent.innerHTML = `
                <div class="p-6">
                    <h2 class="text-2xl font-bold mb-4">New Document Request</h2>
                    <form id="new-request-form" class="space-y-4">
                        <div><label class="text-sm font-medium">Document Type</label><select id="docType" class="w-full p-2 border rounded-md bg-white" required><option>Bonafide Certificate</option><option>Official Transcript</option><option>Migration Certificate</option><option>Others</option></select></div>
                        <div><label class="text-sm font-medium">Purpose</label><textarea id="purpose" class="w-full p-2 border rounded-md bg-white" required></textarea></div>
                        <div class="flex justify-end gap-3 pt-4">
                            <button type="button" class="close-modal-btn px-4 py-2 bg-slate-200 rounded-lg">Cancel</button>
                            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg">Create Request</button>
                        </div>
                    </form>
                </div>`;
        } else if (requestId === 'new_verification') {
            modalContent.innerHTML = `
                <div class="p-6">
                    <h2 class="text-2xl font-bold mb-1">Submit Document for Verification</h2>
                    <p class="text-sm text-slate-500 mb-4">Upload a document that needs attestation or verification from the staff.</p>
                    <form id="new-verification-form" class="space-y-4">
                        <div><label class="text-sm font-medium">Document Name / Title</label><input type="text" id="docName" class="w-full p-2 border rounded-md bg-white" placeholder="e.g., Internship Offer Letter" required /></div>
                        <div><label class="text-sm font-medium">Purpose of Verification</label><textarea id="purpose" class="w-full p-2 border rounded-md bg-white" placeholder="e.g., For academic credit" required></textarea></div>
                        <div><label class="text-sm font-medium">Upload Document</label><input type="file" class="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" required></div>
                        <div class="flex justify-end gap-3 pt-4">
                            <button type="button" class="close-modal-btn px-4 py-2 bg-slate-200 rounded-lg">Cancel</button>
                            <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded-lg">Submit Document</button>
                        </div>
                    </form>
                </div>`;
        } else {
            const req = state.requests.find(r => r.id === requestId);
            if (!req) return;
            modalContent.innerHTML = `
                <div class="p-6">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h2 class="text-2xl font-bold">${req.docType}</h2>
                             <p class="text-sm text-slate-500">Request ID: ${req.id} | For: ${req.studentName}</p>
                             <p class="text-xs font-semibold uppercase tracking-wider mt-1 ${req.requestType === 'verification_submission' ? 'text-green-600' : 'text-blue-600'}">${req.requestType.replace('_', ' ')}</p>
                        </div>
                        <span class="status-badge ${getStatusClass(req.status)}">${req.status}</span>
                    </div>
                </div>
                <div class="bg-white p-6 border-t border-b">
                    <div class="flex border-b mb-4">
                        <button class="tab-btn px-4 py-2 text-blue-600 border-b-2 border-blue-600" data-tab="conversation">Conversation & Files</button>
                        <button class="tab-btn px-4 py-2 text-slate-500" data-tab="activity">Activity Log</button>
                    </div>
                    <div id="conversation" class="tab-content space-y-4">
                        <div><h4 class="font-bold mb-2">Comments</h4><div class="space-y-3">${req.comments.map(c => `<div class="p-3 rounded-lg ${c.by.includes('Staff') ? 'bg-blue-50' : 'bg-slate-100'}"><p class="text-sm">${c.text}</p><p class="text-xs text-slate-500 text-right">${c.by} - ${formatDate(c.timestamp)}</p></div>`).join('') || '<p class="text-sm text-slate-400">No comments yet.</p>'}</div></div>
                        <div><h4 class="font-bold mb-2">Supporting Documents</h4><ul class="list-disc list-inside">${req.supportingFiles.map(f => `<li><a href="${f.url}" class="text-blue-600 hover:underline">${f.name}</a></li>`).join('') || '<p class="text-sm text-slate-400">No supporting documents uploaded.</p>'}</ul></div>
                        <div><h4 class="font-bold mb-2">Final Document</h4>${req.finalPDF ? `<a href="${req.finalPDF.url}" class="text-green-600 font-semibold hover:underline flex items-center gap-2"><i data-lucide="download"></i>${req.finalPDF.name}</a>` : '<p class="text-sm text-slate-400">Not generated yet.</p>'}</div>
                    </div>
                    <div id="activity" class="tab-content hidden"><ul class="list-disc list-inside text-sm text-slate-600">${req.activityLog.map(log => `<li>${log}</li>`).join('')}</ul></div>
                </div>
                <div class="p-6" id="modal-actions">${getModalActions(req)}</div>
            `;
        }
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        safeCreateIcons();
    }
    
    // --- LOGIC for dynamic content ---
    function getStudentNextStep(status) {
        const steps = {
            'Received': 'Upload supporting documents for verification.',
            'Action Required': 'Staff has requested changes. Please review comments and re-upload files.',
            'Submitted': 'Your documents are awaiting review by staff.',
            'Resubmitted': 'Your documents are awaiting review by staff.',
            'Processing': 'Your request is being processed by the administration.',
            'Ready': 'Your document is ready for download!',
            'Collected': 'This request is complete.',
            'Closed': 'This request is closed.'
        };
        return steps[status] || 'No action needed at this time.';
    }

    function getModalActions(req) {
        const { role } = state.currentUser;
        const { status, requestType } = req;
        let actionsHtml = `<div class="flex justify-end"><button class="close-modal-btn px-4 py-2 bg-slate-200 rounded-lg">Close</button></div>`;

        if (role === 'student') {
            if (status === 'Received' || status === 'Action Required') {
                actionsHtml = `<div class="border p-4 rounded-lg bg-white"><h4 class="font-bold mb-2">Your Action</h4><p class="text-sm mb-2">${getStudentNextStep(status)}</p><input type="file" class="text-sm mb-2 w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"><button data-action="submit-files" data-request-id="${req.id}" class="px-4 py-2 bg-blue-600 text-white rounded-lg w-full mt-2">Upload & Submit for Verification</button></div>` + actionsHtml;
            }
            if (status === 'Ready') {
                actionsHtml = `<div class="border p-4 rounded-lg bg-white"><button data-action="mark-collected" data-request-id="${req.id}" class="px-4 py-2 bg-green-600 text-white rounded-lg w-full">I have downloaded/collected the document</button></div>` + actionsHtml;
            }
        }
        if (role === 'staff') {
            let staffActions = '';
            if (['Submitted', 'Resubmitted'].includes(status)) {
                staffActions += `<button data-action="start-processing" data-request-id="${req.id}" class="px-4 py-2 bg-blue-600 text-white rounded-lg">Start Processing</button>`;
            }
            if (['Processing', 'Submitted', 'Resubmitted'].includes(status)) {
                staffActions += `<div class="mt-4 border-t pt-4"><p class="font-semibold mb-2">Request changes or add comments:</p><textarea id="staff-comment" class="w-full p-2 border rounded-md" placeholder="e.g., Please upload a clearer copy..."></textarea><button data-action="request-changes" data-request-id="${req.id}" class="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-lg">Request Changes</button></div>`;
            }
            if (status === 'Processing') {
                staffActions += `<div class="mt-4 border-t pt-4"><p class="font-semibold mb-2">${requestType === 'document_request' ? 'Upload final signed PDF:' : 'Upload verified/stamped document:'}</p><input type="file" class="text-sm mb-2 w-full"><button data-action="approve" data-request-id="${req.id}" class="px-4 py-2 bg-green-600 text-white rounded-lg">Approve & Make Ready</button></div>`;
            }
            if (status === 'Ready') {
                staffActions += `<button data-action="mark-collected" data-request-id="${req.id}" class="px-4 py-2 bg-slate-600 text-white rounded-lg">Mark as Collected (Hard Copy)</button>`;
            }
            if(staffActions) actionsHtml = `<div class="border p-4 rounded-lg bg-blue-50"><h4 class="font-bold mb-2">Staff Actions</h4>${staffActions}</div>` + actionsHtml;
        }
        return actionsHtml;
    }
    
    // --- EVENT HANDLERS ---
    function handleLogin(role, name) { state.currentUser = { role, name }; render(); }
    function handleLogout() { 
        // Only clear the current user, keeping requests for the session
        state.currentUser = null; 
        render(); 
    }

    function handleModalAction(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        const requestId = parseInt(target.dataset.requestId, 10);
        const reqIndex = state.requests.findIndex(r => r.id === requestId);
        if (reqIndex === -1) return;

        const logTime = new Date().toISOString().split('.')[0].replace('T', ' ');
        const studentName = state.requests[reqIndex].studentName;
        const staffName = state.currentUser.name;
        
        const newStatusMap = {
            'submit-files': state.requests[reqIndex].status === 'Received' ? 'Submitted' : 'Resubmitted',
            'start-processing': 'Processing',
            'request-changes': 'Action Required',
            'approve': 'Ready',
            'mark-collected': 'Collected'
        };

        const newStatus = newStatusMap[action];
        if (newStatus) {
            state.requests[reqIndex].status = newStatus;
            let logMessage = `${logTime} - ${studentName} uploaded documents (${newStatus})`;
            if(state.currentUser.role === 'staff') { logMessage = `${logTime} - ${staffName} updated status to ${newStatus}`; }
            state.requests[reqIndex].activityLog.push(logMessage);
        }
        
        if (action === 'request-changes') {
            const commentText = document.getElementById('staff-comment').value;
            if (commentText) {
                state.requests[reqIndex].comments.push({ by: staffName, text: commentText, timestamp: new Date().toISOString()});
                state.requests[reqIndex].activityLog.push(`${logTime} - ${staffName} commented: "${commentText}"`);
            }
        }
        
        if (action === 'approve') { state.requests[reqIndex].finalPDF = { name: `signed_doc_${requestId}.pdf`, url: "#" }; }
        
        renderModal(requestId);
        // No saveState() needed as we're not persisting
        render();
    }

    function handleCreateRequest(e) {
        e.preventDefault();
        const newId = Math.max(...state.requests.map(r => r.id), 100) + 1;
        const newRequest = {
            id: newId, requestType: "document_request", studentName: "xyz", rollNumber: "CS2025", 
            docType: document.getElementById('docType').value, purpose: document.getElementById('purpose').value, status: "Received",
            supportingFiles: [], finalPDF: null, comments: [],
            activityLog: [`${new Date().toISOString().split('.')[0].replace('T', ' ')} - xyz created request (Received)`]
        };
        state.requests.push(newRequest);
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        render();
    }
    
    function handleCreateVerification(e) {
        e.preventDefault();
        const newId = Math.max(...state.requests.map(r => r.id), 100) + 1;
        const docName = document.getElementById('docName').value;
        const fileInput = e.target.querySelector('input[type="file"]');
        const fileName = fileInput.files.length > 0 ? fileInput.files[0].name : 'submitted_document.pdf';
        const newRequest = {
            id: newId, requestType: "verification_submission", studentName: "xyz", rollNumber: "CS2025",
            docType: docName, purpose: document.getElementById('purpose').value, status: "Submitted",
            supportingFiles: [{ name: fileName, url: "#" }], finalPDF: null, comments: [],
            activityLog: [`${new Date().toISOString().split('.')[0].replace('T', ' ')} - xyz submitted '${docName}' for verification (Submitted)`]
        };
        state.requests.push(newRequest);
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        render();
    }
    
    // --- EVENT LISTENERS ---
    document.getElementById('login-student').addEventListener('click', () => handleLogin('student', 'xyz (CS2025)'));
    document.getElementById('login-staff').addEventListener('click', () => handleLogin('staff', 'John (Staff)'));
    document.querySelectorAll('.logout-button').forEach(btn => btn.addEventListener('click', handleLogout));
    document.getElementById('new-request-btn').addEventListener('click', () => renderModal('new'));
    document.getElementById('submit-verification-btn').addEventListener('click', () => renderModal('new_verification'));

    document.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('[data-request-id]');
        if (viewBtn && !viewBtn.hasAttribute('data-action')) { renderModal(parseInt(viewBtn.dataset.requestId, 10)); }
        if (e.target.classList.contains('close-modal-btn') || e.target.id === 'request-modal') { modal.classList.add('hidden'); document.body.classList.remove('overflow-hidden'); }
        if (e.target.classList.contains('tab-btn')) {
            modalContent.querySelectorAll('.tab-btn').forEach(btn => { btn.classList.remove('text-blue-600', 'border-blue-600'); btn.classList.add('text-slate-500'); });
            e.target.classList.add('text-blue-600', 'border-blue-600'); e.target.classList.remove('text-slate-500');
            modalContent.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
            document.getElementById(e.target.dataset.tab).classList.remove('hidden');
        }
    });
    
    modal.addEventListener('click', handleModalAction);
    modal.addEventListener('submit', (e) => {
        if (e.target.id === 'new-request-form') handleCreateRequest(e);
        else if (e.target.id === 'new-verification-form') handleCreateVerification(e);
    });

    // --- INITIAL RENDER ---
    render();
});