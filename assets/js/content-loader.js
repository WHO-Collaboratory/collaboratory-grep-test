const Custom_ContentLoader = {

  // ── Utilities ─────────────────────────────────────────────────

  revealIO: new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        Custom_ContentLoader.revealIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }),

  async fetchText(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status + ': ' + url);
    return r.text();
  },

  // Parse Markdown text into a temporary DOM container
  mdDOM(text) {
    const el = document.createElement('div');
    el.innerHTML = marked.parse(text);
    return el;
  },

  // Return innerHTML of a list of nodes with all <img> removed
  nodesHTML(nodes) {
    const tmp = document.createElement('div');
    nodes.forEach(n => tmp.appendChild(n.cloneNode(true)));
    tmp.querySelectorAll('img').forEach(i => i.remove());
    return tmp.innerHTML;
  },

  // Extract sections delimited by H3 headings from a parsed MD DOM
  // Returns: [{ title: string, nodes: Node[] }, ...]
  h3Sections(dom) {
    const result = [];
    let cur = null;

    for (const node of dom.childNodes) {
      if (node.nodeType !== 1) continue;          // element nodes only
      if (node.tagName === 'H2') continue;        // skip top-level heading

      if (node.tagName === 'H3') {
        if (cur) result.push(cur);

        // keep original title logic
        const title = node.textContent.trim();

        // new: extract hyperlink if exists
        const linkEl = node.querySelector('a');
        const href = linkEl ? linkEl.getAttribute('href') : null;

        cur = { 
          title: title,
          href: href,
          nodes: []
        };

      } else if (cur) {
        cur.nodes.push(node.cloneNode(true));
      }
    }

    if (cur) result.push(cur);
    return result;
  },

  // Find first section whose title contains keyword (case-insensitive)
  findSec(sections, keyword) {
    return sections.find(s => s.title.toLowerCase().includes(keyword.toLowerCase()));
  },
  findSecByIndex(sections, index) {
    return sections[index];
  },
  reObserve(container) {
    container.querySelectorAll('.reveal').forEach(el => {
      el.classList.remove('in-view');
      this.revealIO.observe(el);
    });
  },


  // About

  buildAbout(md) {
    const dom  = this.mdDOM(md);
    const secs = this.h3Sections(dom);
    const cards = [];

    //  Card 1: Overview
    const overview = this.findSec(secs, 'overview');
    if (overview) {
      cards.push(`
        <article class="card reveal d1">
          <h3 class="card__title">${overview.title}</h3>
          <div class="card__text">${this.nodesHTML(overview.nodes)}</div>
        </article>`);
    }

    // Cards 2 & 3: Community Membership + Key Initiatives
    const membership = this.findSec(secs, 'community membership');
    if (membership) {
      // Split nodes at the H4 ("Learn more about the initiatives")
      const beforeH4 = [], afterH4 = [];
      let pastH4 = false;
      for (const n of membership.nodes) {
        if (n.tagName === 'H4') { pastH4 = true; continue; }
        (pastH4 ? afterH4 : beforeH4).push(n);
      }

      cards.push(`
        <article class="card reveal d2">
          <h3 class="card__title">Community Membership</h3>
          <div class="card__text">${this.nodesHTML(beforeH4)}</div>
          <img src="assets/WhodoesWhat.png" alt="Who does what — community roles" class="card__img" />
        </article>`);

      // Card 3: links from the #### section
      if (afterH4.length) {
        const linksDiv = document.createElement('div');
        afterH4.forEach(n => linksDiv.appendChild(n.cloneNode(true)));
        const linkEls = linksDiv.querySelectorAll('a');
        let linksHTML = '<div class="card__links">';
        linkEls.forEach(a => {
          linksHTML += `<a href="${a.href}" target="_blank" rel="noopener noreferrer">${a.textContent.trim()}</a>`;
        });
        linksHTML += '</div>';
        cards.push(`
          <article class="card reveal d3">
            <h3 class="card__title">Key Initiatives</h3>
            <p class="card__text">Learn more about the initiatives that support and extend the work of this community:</p>
            ${linksHTML}
          </article>`);
      }
    }

    // Card 4 (wide): Project Status + Workstreams
    const status     = this.findSec(secs, 'project status');
    const workstreams = this.findSec(secs, 'workstream');
    let wsDescHTML = '';
    if (workstreams) {
      const wsTmp = document.createElement('div');
      workstreams.nodes.forEach(n => wsTmp.appendChild(n.cloneNode(true)));
      const wDivs = wsTmp.querySelectorAll('[id^="w"]');
      if (wDivs.length) {
        wDivs.forEach(d => {
          wsDescHTML += `<p class="card__text" style="margin-top:0.6rem;">${d.textContent.trim()}</p>`;
        });
      }
    }
    cards.push(`
      <article class="card card--wide reveal d4">
        <h3 class="card__title">${status ? status.title : 'Current Project Status'}</h3>
        <img src="assets/Sep2024Status.png" alt="Project status" class="card__img" />
        <p class="card__text" style="margin-top:1.1rem;font-weight:600;color:var(--navy);">Our Workstreams</p>
        <img src="assets/workstreams.png" alt="Workstreams diagram" class="card__img" />
        ${wsDescHTML}
      </article>`);

    // ── Card 5 2024 Workshop + Hackathon
    const workshop = this.findSec(secs, 'workshop');
    let reportLink = '';
    if (workshop) {
      const wTmp = document.createElement('div');
      workshop.nodes.forEach(n => wTmp.appendChild(n.cloneNode(true)));
      wTmp.querySelectorAll('a').forEach(a => {
        if (a.href && !a.href.includes('youtube')) {
          reportLink = `<a href="${a.href}" target="_blank" rel="noopener noreferrer" class="card__link" style="margin-top:0.9rem;">Access the meeting report &#8594;</a>`;
        }
      });
    }
    cards.push(`
      <article class="card card--wide reveal d5">
        <h3 class="card__title">${workshop ? workshop.title : '2024 In-Person Workshop'}</h3>
        ${reportLink}
        <img src="assets/Report.png" alt="Workshop meeting report" class="card__img" />
      </article>`);

    return cards.join('\n');
  },


  // Community

  buildCommunity(md) {
    const dom  = this.mdDOM(md);
    const secs = this.h3Sections(dom);
    console.log(secs);
    const cards = [];

    // Cards 1 : Resoruces
    const res = this.findSecByIndex(secs, 0); // findSec(secs, 'community members');
    if (res) {
      const paras = res.nodes.filter(n => n.tagName === 'P');
      if (paras[0]) {
        cards.push(`
          <article class="card1 reveal d1">
            <h3 class="card__title">${res.title}</h3>
            <div class="card__text">${paras[0].innerHTML}</div>
          </article>`);
      }
      if (paras[1]) {
        cards.push(`
          <article class="card1 reveal d2">
            <h3 class="card__title">Our Global Network</h3>
            <div class="card__text">${paras[1].innerHTML}</div>
          </article>`);
      }
    }
    // Card 2: Activities
    const Activities = this.findSecByIndex(secs, 1); // this.findSec(secs, 'how to join');
    if (Activities) {
      const actTmp = document.createElement('div');
      Activities.nodes.forEach(n => actTmp.appendChild(n.cloneNode(true)));
      cards.push(`
        <article class="card1 reveal d2">
          <h3 class="card__title">${Activities.title}</h3>
          <div class="card__text">${actTmp.innerHTML}</div>
        </article>`);
    }

    // Card 3: How to Join
    const join = this.findSecByIndex(secs, 2); // this.findSec(secs, 'how to join');
    if (join) {
      cards.push(`
        <article class="card1 reveal d3">
          <h3 class="card__title">${join.title}</h3>
          <div class="card__text">${this.nodesHTML(join.nodes)}</div>
        </article>`);
    }
    // Card 4: Grepi initiative
    const grepi_Init = this.findSecByIndex(secs, 3); // this.findSec(secs, 'GREP initiative');
    if (grepi_Init) {
      cards.push(`
        <article class="card1 card1--wide reveal d5">
          <h3 class="card__title">${grepi_Init.title}</h3>
          <img src="assets/TWG.png" alt="Community Technical Working Group members" class="card__img" />
        </article>`);
    }

    return cards.join('\n');
  },


  // NEWS

  buildNews(md) {
    const dom       = this.mdDOM(md);
    const listItems = dom.querySelectorAll('li');
    const notices   = [];
    const events    = [];

    listItems.forEach(li => {
      const strong = li.querySelector('strong');
      if (!strong) {
        notices.push(li.textContent.trim());
        return;
      }
      const dateText = strong.textContent.trim();
      const descHTML = li.innerHTML.replace(/<strong>[^<]*<\/strong>\s*:?\s*/, '').trim();
      const isNotice = descHTML.toLowerCase().includes('see you again');
      if (isNotice) {
        notices.push(dateText + ': ' + descHTML.replace(/<[^>]+>/g, ''));
      } else {
        events.push({ dateText, descHTML });
      }
    });

    let html = '';

    notices.forEach(text => {
      html += `
        <div class="timeline-notice">
          <span class="timeline-notice__icon">📢</span>
          ${text}
        </div>`;
    });

    const byYear = {};
    events.forEach(ev => {
      const m = ev.dateText.match(/\b(20\d{2})\b/);
      if (!m) return;
      const yr = m[1];
      if (!byYear[yr]) byYear[yr] = [];
      byYear[yr].push(ev);
    });

    Object.keys(byYear).sort((a, b) => +b - +a).forEach(year => {
      html += `
        <div class="timeline-year">
          <span class="timeline-year__badge">${year}</span>
        </div>
        <div class="timeline-list">`;
      byYear[year].forEach(ev => {
        const tag = this.tagFromEvent(ev);
        const tagHTML = tag ? `<span class="timeline-item__tag ${tag.cls}">${tag.label}</span>` : '';
        html += `
          <div class="timeline-item">
            <div class="timeline-item__date">${ev.dateText} ${tagHTML}</div>
            <p class="timeline-item__text">${ev.descHTML}</p>
          </div>`;
      });
      html += `</div>`;
    });

    return html;
  },

  buildResources(md) {
    const dom = this.mdDOM(md);
    const secs = this.h3Sections(dom);

    return this.buildCardsFromIndexes(secs, [0, 1, 2,3,4,5]);
  },
  
  buildCardsFromIndexes(secs, indexes) {
    const cards = [];

    indexes.forEach(i => {
      const sec = this.findSecByIndex(secs, i);
      if (!sec) return;

      console.log(sec);

      const tmp = document.createElement('div');
      sec.nodes.forEach(n => tmp.appendChild(n.cloneNode(true)));

      let titleHTML = "";

      if (sec.title !== "NoTitle") {
        if (sec.href) {
          titleHTML = `<h3 class="card__title"><a href="${sec.href}" target="_blank" rel="noopener noreferrer">${sec.title}</a></h3>`;
        } else {
          titleHTML = `<h3 class="card__title">${sec.title}</h3>`;
        }
      }

      cards.push(`
        <article class="card1 reveal d1">
          ${titleHTML}
          <div class="card__text">${tmp.innerHTML}</div>
        </article>
      `);
    });

    return cards.join('\n');
  },

  tagFromEvent(ev) {
    const d = (ev.descHTML + ' ' + ev.dateText).toLowerCase();
    if (d.includes('virtual webinar') || d.includes('virtual presentation') || d.includes('webinar'))
      return { cls: 'tag-webinar',  label: 'Webinar'      };
    if (d.includes('in person') || d.includes('in-person') || d.includes('hackathon') || /\d[–\-]\d/.test(ev.dateText))
      return { cls: 'tag-inperson', label: 'In Person'    };
    if (d.includes('workshop'))
      return { cls: 'tag-workshop', label: 'Workshop'     };
    if (d.includes('consultation'))
      return { cls: 'tag-consult',  label: 'Consultation' };
    return null;
  },


  // Resources section

  parseResourcesMd(text) {
    const bgRows          = [];
    const meetingSections = [];
    let current           = null;

    text.split('\n').forEach(raw => {
      const line = raw.trim();
      if (!line || line.startsWith('## ')) return;

      if (line.startsWith('### ')) {
        const heading = line.slice(4).trim();
        const isBg    = heading.toLowerCase().includes('support for');
        current = { title: heading, rows: [], isBg };
        meetingSections.push(current);
        return;
      }

      if (line.startsWith('|') && !line.startsWith('|---')) {
        const row = this.parseTableRow(line);
        if (!row) return;
        if (current === null) bgRows.push(row);
        else current.rows.push(row);
      }
    });

    return { bgRows, meetingSections };
  },

  parseTableRow(line) {
    const parts = line.split('|').slice(1, -1).map(c => c.trim());
    if (parts.length < 2) return null;

    const iconCell = parts[0];
    const nameCell = parts[1];
    const dlCell   = parts[2] || '';

    let type = iconCell.includes('pdf-icon') ? 'pdf' : 'ext';

    const nm = nameCell.match(/\*\*\[([^\]]+)\]\(([^)]+)\)\*\*/);
    if (!nm) return null;
    const name = nm[1].trim();
    const url  = nm[2].trim();

    if      (/\.R\b/.test(url)  || name.toLowerCase().includes('r code'))    type = 'r';
    else if (/\.Rmd\b/.test(url) || /r markdown/i.test(name) || /\brmd\b/i.test(name)) type = 'rmd';
    else if (/\.html\b/.test(url) || /html/i.test(name)) type = 'html';

    let dlUrl = '';
    const dl = dlCell.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (dl) dlUrl = dl[2].trim();

    return { type, name, url, dlUrl };
  },

  buildResourcesHTML(bgRows, meetingSections) {
    const mpoxSecs  = meetingSections.filter(s => s.isBg);
    const twgSecs   = meetingSections.filter(s => !s.isBg);
    const allBgRows = [...bgRows, ...mpoxSecs.flatMap(s => s.rows)];

    // ── Background Resources Grid ──────────────────────────────
    let gridHTML = '<div class="resources-grid reveal">';
    allBgRows.forEach(row => {
      const icon  = row.type === 'pdf' ? '📄' : '🌐';
      const badge = row.type === 'pdf'
        ? '<span class="res-badge res-badge--pdf">PDF</span>'
        : '<span class="res-badge res-badge--ext">&#8599;</span>';
      gridHTML += `
        <a href="${row.url}" target="_blank" rel="noopener noreferrer" class="res-card">
          <div class="res-card__icon">${icon}</div>
          <div>
            <div class="res-card__title">${row.name} ${badge}</div>
            ${row.dlUrl ? `<div class="res-card__desc"><a href="${row.dlUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--blue)">&#8595; Download PDF</a></div>` : ''}
          </div>
        </a>`;
    });
    gridHTML += '</div>';

    // ── Meeting Materials Accordion ────────────────────────────
    let accordionHTML = '<div class="res-accordion reveal">';
    twgSecs.forEach(sec => {
      if (!sec.rows.length) return;
      const cnt = sec.rows.length;
      accordionHTML += `
        <div class="res-group">
          <button class="res-group__hd" aria-expanded="false">
            <span class="res-group__date">${sec.title}</span>
            <span class="res-group__count">${cnt} ${cnt === 1 ? 'document' : 'documents'}</span>
            <span class="res-group__chevron">&#8250;</span>
          </button>
          <div class="res-group__body">`;
      sec.rows.forEach(row => {
        const badgeCls   = 'doc-badge-' + row.type;
        const LABELS = { pdf: 'PDF', r: 'R', rmd: 'Rmd', html: 'HTML', ext: '&#8599;' };
        const badgeLabel = LABELS[row.type] || row.type.toUpperCase();
        accordionHTML += `
            <div class="res-doc">
              <span class="doc-badge ${badgeCls}">${badgeLabel}</span>
              <span class="res-doc__name">
                <a href="${row.url}" target="_blank" rel="noopener noreferrer">${row.name}</a>
              </span>
              <div class="res-doc__btns">
                ${row.dlUrl ? `<a href="${row.dlUrl}" target="_blank" rel="noopener noreferrer" class="res-doc__btn res-doc__btn--dl">Download</a>` : ''}
              </div>
            </div>`;
      });
      accordionHTML += `
          </div>
        </div>`;
    });
    accordionHTML += '</div>';

    return { gridHTML, accordionHTML };
  },

  initAccordion(container) {
    container.querySelectorAll('.res-group__hd').forEach(btn => {
      btn.addEventListener('click', function () {
        const group  = this.closest('.res-group');
        const body   = this.nextElementSibling;
        const isOpen = group.classList.contains('is-open');
        group.classList.toggle('is-open', !isOpen);
        this.setAttribute('aria-expanded', String(!isOpen));
        body.style.maxHeight = isOpen ? '0' : body.scrollHeight + 'px';
      });
    });
    // Open the most recent group by default
    const first = container.querySelector('.res-group');
    if (first) {
      const btn  = first.querySelector('.res-group__hd');
      const body = first.querySelector('.res-group__body');
      first.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      body.style.maxHeight = body.scrollHeight + 'px';
    }
  },

  async init() {
    try {
      const [aboutMd, communityMd, newsMd, resourcesMd] = await Promise.all([
        this.fetchText('assets/md/about.md'),
        this.fetchText('assets/md/community.md'),
        this.fetchText('assets/md/news.md'),
        this.fetchText('assets/md/resources.md'),
      ]);

      // About
      const aboutEl = document.getElementById('about-cards');
      if (aboutEl) {
        aboutEl.innerHTML = this.buildAbout(aboutMd);
        this.reObserve(aboutEl);
      }

      // Community
      const commEl = document.getElementById('community-cards');
      if (commEl) {
        commEl.innerHTML = this.buildCommunity(communityMd);
        this.reObserve(commEl);
      }
      // Resources
      const resEl = document.getElementById('resources-cards');
      if (resEl) {
        resEl.innerHTML = this.buildResources(resourcesMd);
        this.reObserve(resEl);
      }

      // News
      // const newsEl = document.getElementById('news-content');
      // if (newsEl) {
      //   newsEl.innerHTML = this.buildNews(newsMd);
      //   this.reObserve(newsEl);
      // }

      // Resources
      // // const { bgRows, meetingSections } = this.parseResourcesMd(resourcesMd);
      // // const { gridHTML, accordionHTML }  = this.buildResourcesHTML(bgRows, meetingSections);

      // // const bgEl = document.getElementById('res-bg-grid');
      // // if (bgEl) {
      // //   bgEl.innerHTML = gridHTML;
      // //   this.reObserve(bgEl);
      // // }

      // // const meetEl = document.getElementById('res-meeting-acc');
      // // if (meetEl) {
      // //   meetEl.innerHTML = accordionHTML;
      // //   this.initAccordion(meetEl);
      // //   this.reObserve(meetEl);
      // // }

    } catch (err) {
      console.error('[content-loader]', err);
    }
  },
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Custom_ContentLoader.init());
} else {
  Custom_ContentLoader.init();
}
