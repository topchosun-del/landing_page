let _config = null;

async function loadConfig() {
  if (_config) return _config;
  let api = {}, file = {};
  try { const r = await fetch('/api/config'); if (r.ok) api = await r.json(); } catch(e) {}
  try { const r = await fetch('config/git_config.json'); if (r.ok) file = await r.json(); } catch(e) {}
  const apiTok = String(api.github_token || '').trim();
  const fileTok = String(file.github_token || '').trim();
  _config = {
    github_token: (apiTok && apiTok !== 'YOUR_GITHUB_TOKEN') ? apiTok : fileTok,
    github_owner: file.github_owner || '',
    github_repo: file.github_repo || '',
    data_file_path: file.data_file_path || 'data/posts.json',
    admin_password: api.admin_password || file.admin_password || 'admin1234'
  };
  return _config;
}

function isAdmin() {
  return sessionStorage.getItem('isAdmin') === 'true';
}

function requireAdmin() {
  if (!isAdmin()) {
    window.location.href = 'admin.html';
    return false;
  }
  return true;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMarkdown(src) {
  if (!src) return '';
  let text = escapeHtml(src);

  const codeBlocks = [];
  text = text.replace(/```([\s\S]*?)```/g, (match, p1) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre class="bg-surface p-3.5 rounded-xl overflow-x-auto text-sm my-3 font-mono border border-border"><code>${p1.trim()}</code></pre>`);
    return `<!--CB_${idx}-->`;
  });

  const parts = text.split('`');
  for (let i = 1; i < parts.length; i += 2) {
    parts[i] = `<code class="px-1.5 py-0.5 rounded bg-surface text-primary font-mono text-xs border border-border">${parts[i]}</code>`;
  }
  text = parts.join('');

  const lines = text.split(/\r?\n/);
  const out = [];
  let inList = false;
  let inNumList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (/^<!--CB_\d+-->$/.test(line.trim())) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inNumList) { out.push('</ol>'); inNumList = false; }
      out.push(line);
      continue;
    }

    if (line.trim() === '---' || line.trim() === '***') {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inNumList) { out.push('</ol>'); inNumList = false; }
      out.push('<hr class="my-5 border-border"/>');
      continue;
    }

    const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inNumList) { out.push('</ol>'); inNumList = false; }
      const lvl = hMatch[1].length;
      const headingText = formatInline(hMatch[2]);
      const cls = lvl === 1 ? 'text-2xl font-bold mt-6 mb-3 text-foreground'
        : lvl === 2 ? 'text-xl font-bold mt-5 mb-2.5 text-foreground'
        : lvl === 3 ? 'text-lg font-semibold mt-4 mb-2 text-foreground'
        : 'text-base font-semibold mt-3 mb-1 text-foreground';
      out.push(`<h${lvl} class="${cls}">${headingText}</h${lvl}>`);
      continue;
    }

    const qMatch = line.match(/^>\s+(.*)$/);
    if (qMatch) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (inNumList) { out.push('</ol>'); inNumList = false; }
      out.push(`<blockquote class="border-l-4 border-primary pl-3.5 py-1.5 my-3 bg-surface-alt/60 rounded-r-lg text-body text-sm font-medium">${formatInline(qMatch[1])}</blockquote>`);
      continue;
    }

    const ulMatch = line.match(/^[-*+]\s+(.*)$/);
    if (ulMatch) {
      if (inNumList) { out.push('</ol>'); inNumList = false; }
      if (!inList) { out.push('<ul class="list-disc pl-5 my-2.5 space-y-1 text-body text-sm">'); inList = true; }
      out.push(`<li>${formatInline(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (inList) { out.push('</ul>'); inList = false; }
      if (!inNumList) { out.push('<ol class="list-decimal pl-5 my-2.5 space-y-1 text-body text-sm">'); inNumList = true; }
      out.push(`<li>${formatInline(olMatch[1])}</li>`);
      continue;
    }

    if (inList) { out.push('</ul>'); inList = false; }
    if (inNumList) { out.push('</ol>'); inNumList = false; }

    if (!line.trim()) {
      continue;
    }

    out.push(`<p class="my-2.5 leading-relaxed text-body text-sm md:text-base">${formatInline(line)}</p>`);
  }

  if (inList) out.push('</ul>');
  if (inNumList) out.push('</ol>');

  let result = out.join('\n');
  result = result.replace(/<!--CB_(\d+)-->/g, (m, id) => codeBlocks[Number(id)] || '');
  return result;
}

function formatInline(str) {
  if (!str) return '';
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/~~(.*?)~~/g, '<del class="line-through text-muted">$1</del>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline font-semibold">$1</a>');
}

function markdownToText(src) {
  if (!src) return '';
  return src
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/---|\*\*\*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getPosts() {
  const cached = localStorage.getItem('cached_posts');
  let posts = null;
  if (cached) {
    try { posts = JSON.parse(cached); } catch(e) {}
  }

  try {
    const config = await loadConfig();
    let dataUrl = config.data_file_path || 'data/posts.json';
    
    if (config.github_token && config.github_owner && config.github_repo) {
      const cleanTok = String(config.github_token).trim().replace(/\s+/g, '');
      const apiUrl = `https://api.github.com/repos/${config.github_owner}/${config.github_repo}/contents/${dataUrl}?ref=main&t=${Date.now()}`;
      const res = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': 'token ' + cleanTok
        }
      });
      if (res.ok) {
        const ghData = await res.json();
        const decoded = decodeURIComponent(escape(atob(ghData.content.replace(/\s+/g, ''))));
        posts = JSON.parse(decoded);
        localStorage.setItem('cached_posts', JSON.stringify(posts));
        return sortPosts(posts);
      }
    }

    const localRes = await fetch(dataUrl + '?t=' + Date.now());
    if (localRes.ok) {
      posts = await localRes.json();
      localStorage.setItem('cached_posts', JSON.stringify(posts));
      return sortPosts(posts);
    }
  } catch(e) {
    console.warn('Failed to fetch latest posts from remote, using cache if available', e);
  }

  return sortPosts(posts || []);
}

function sortPosts(list) {
  return (list || []).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

async function getPost(id) {
  const posts = await getPosts();
  return posts.find(p => String(p.id) === String(id)) || null;
}

async function savePostsToGitHub(posts) {
  const config = await loadConfig();
  const cleanTok = String(config.github_token).trim().replace(/\s+/g, '');
  
  localStorage.setItem('cached_posts', JSON.stringify(posts));

  if (!cleanTok || !config.github_owner || !config.github_repo) {
    return { success: true, localOnly: true, message: '로컬 스토리지에만 저장되었습니다 (GitHub 연동 미완료).' };
  }

  const path = config.data_file_path || 'data/posts.json';
  const apiUrl = `https://api.github.com/repos/${config.github_owner}/${config.github_repo}/contents/${path}`;

  let sha = null;
  try {
    const getRes = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + cleanTok
      }
    });
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }
  } catch(e) {}

  const jsonStr = JSON.stringify(posts, null, 2);
  const encodedContent = btoa(unescape(encodeURIComponent(jsonStr)));

  const putBody = {
    message: 'Update posts data via Admin UI',
    content: encodedContent,
    branch: 'main'
  };
  if (sha) putBody.sha = sha;

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': 'token ' + cleanTok,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(putBody)
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`저장 실패 (${putRes.status}): ${errText}`);
  }

  return { success: true };
}

async function addPost(postData) {
  const posts = await getPosts();
  const newPost = {
    id: String(Date.now()),
    title: postData.title || '제목 없음',
    category: postData.category || '일반',
    date: postData.date || new Date().toISOString().split('T')[0],
    views: 0,
    content: postData.content || ''
  };
  posts.unshift(newPost);
  await savePostsToGitHub(posts);
  return newPost;
}

async function updatePost(id, updateData) {
  const posts = await getPosts();
  const idx = posts.findIndex(p => String(p.id) === String(id));
  if (idx === -1) throw new Error('게시글을 찾을 수 없습니다.');
  posts[idx] = {
    ...posts[idx],
    ...updateData,
    id: String(id)
  };
  await savePostsToGitHub(posts);
  return posts[idx];
}

async function deletePost(id) {
  const posts = await getPosts();
  const filtered = posts.filter(p => String(p.id) !== String(id));
  await savePostsToGitHub(filtered);
  return true;
}

window.loadConfig = loadConfig;
window.isAdmin = isAdmin;
window.requireAdmin = requireAdmin;
window.renderMarkdown = renderMarkdown;
window.markdownToText = markdownToText;
window.getPosts = getPosts;
window.getPost = getPost;
window.addPost = addPost;
window.updatePost = updatePost;
window.deletePost = deletePost;
