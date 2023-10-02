export const useSidebar = () => {
  const handleToggleSidebar = () => {
    const sidebar = document.querySelector('.otter-sidebar-pane');
    if (sidebar) {
      if (sidebar.classList.contains('is-active')) {
        sidebar.classList.remove('is-active');
      } else {
        sidebar.classList.add('is-active');
      }
    }
  };
  const handleCloseSidebar = () => {
    const sidebar = document.querySelector('.otter-sidebar-pane');
    if (sidebar) {
      if (sidebar.classList.contains('is-active')) {
        sidebar.classList.remove('is-active');
      }
    }
  };

  return { handleCloseSidebar, handleToggleSidebar };
};
