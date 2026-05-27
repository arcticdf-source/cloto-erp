(function() {
  var items = [
    { key: 'companies', label: 'Компании', icon: '🏢', href: 'companies.html' },
    { key: 'contacts', label: 'Контакты', icon: '👤', href: 'clients.html#contacts' },
    { key: 'leads', label: 'Лиды/сделки', icon: '🤝', href: 'leads-deals.html' },
    { key: 'plan', label: 'План поставок', icon: '📈', href: 'supply-plan-hub.html' },
    { key: 'channels', label: 'Каналы продаж', icon: '📡', href: 'sales-channels.html' },
    { key: 'report', label: 'Отчет о продажах', icon: '📊', href: 'sales-report.html' },
    { key: 'calendar', label: 'Календарь', icon: '📅', href: 'crm-calendar.html' },
    { key: 'tasks', label: 'Задачи и проекты', icon: '☑', href: 'clients.html#tasks' },
    { key: 'collaboration', label: 'Совместная работа', icon: '👥', href: 'crm-collaboration.html' },
    { key: 'team', label: 'Команда', icon: '👤', href: 'crm-team.html' },
    { key: 'signature', label: 'Подпись', icon: '✍', href: 'crm-signature.html' }
  ];

  var path = window.location.pathname.split('/').pop();
  var hash = String(window.location.hash || '').toLowerCase();

  function isActive(item) {
    var hrefParts = item.href.split('#');
    var hrefPath = hrefParts[0];
    var hrefHash = hrefParts[1] ? ('#' + hrefParts[1]).toLowerCase() : '';
    if (hrefPath !== path) {
      return false;
    }
    if (!hrefHash) {
      return !hash;
    }
    return hash === hrefHash;
  }

  function renderSidebar() {
    if (!document.body) return;
    if (document.querySelector('.crm-module-sidebar')) return;

    var sidebar = document.createElement('aside');
    sidebar.className = 'crm-module-sidebar';
    sidebar.setAttribute('aria-label', 'Левое меню CRM');

    var back = document.createElement('a');
    back.className = 'crm-module-sidebar-back';
    back.href = 'commercial.html';
    back.textContent = '← Назад в коммерческий отдел';
    sidebar.appendChild(back);

    var list = document.createElement('nav');
    list.className = 'crm-module-sidebar-list';

    items.forEach(function(item) {
      var link = document.createElement('a');
      link.className = 'crm-module-sidebar-item' + (isActive(item) ? ' active' : '');
      link.href = item.href;
      link.innerHTML = '<span class="crm-module-sidebar-icon">' + item.icon + '</span><span class="crm-module-sidebar-text">' + item.label + '</span>';
      list.appendChild(link);
    });

    sidebar.appendChild(list);
    document.body.insertBefore(sidebar, document.body.firstChild);
    document.body.classList.add('crm-module-sidebar-enabled');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSidebar);
  } else {
    renderSidebar();
  }
}());
