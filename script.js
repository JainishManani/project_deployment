document.addEventListener('DOMContentLoaded', () => {
  fetch(`header.html?nocache=${Date.now()}`)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load header: ${response.status}`);
      return response.text();
    })
    .then(data => {
      document.getElementById('header').innerHTML = data;
      const token = localStorage.getItem('token');
      const authNav = document.getElementById('auth-nav');
      if (token) {
        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch user');
            return response.json();
          })
          .then(data => {
            authNav.innerHTML = `
              <span class="nav-link">Welcome, ${data.Username}</span>
              <a class="nav-link" href="#" id="logoutLink" aria-label="Logout">Logout</a>
            `;
            document.getElementById('logoutLink').addEventListener('click', (e) => {
              e.preventDefault();
              fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
              })
                .then(() => {
                  localStorage.removeItem('token');
                  window.location.href = 'login.html';
                });
            });
          })
          .catch(err => {
            console.error('Error fetching user:', err.message);
            authNav.innerHTML = `
              <a class="nav-link" href="login.html">Login</a>
              <a class="nav-link" href="signup.html">Signup</a>
            `;
          });
      } else {
        authNav.innerHTML = `
          <a class="nav-link" href="login.html">Login</a>
          <a class="nav-link" href="signup.html">Signup</a>
        `;
      }
    })
    .catch(error => {
      console.error('Error loading header:', error.message);
      document.getElementById('header').innerHTML = '<p class="text-danger text-center">Failed to load header</p>';
    });

  fetch(`footer.html?nocache=${Date.now()}`)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load footer: ${response.status}`);
      return response.text();
    })
    .then(data => {
      document.getElementById('footer').innerHTML = data;
    })
    .catch(error => {
      console.error('Error loading footer:', error.message);
      document.getElementById('footer').innerHTML = '<p class="text-danger text-center">Failed to load footer</p>';
    });

  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const resetPasswordLink = document.getElementById('resetPasswordLink');
  const addBookForm = document.getElementById('addBookForm');
  const bookList = document.getElementById('bookList');
  const searchForm = document.getElementById('searchForm');
  const searchResults = document.getElementById('searchResults');
  const prevPage = document.getElementById('prevPage');
  const nextPage = document.getElementById('nextPage');
  const profileForm = document.getElementById('profileForm');
  const favoritesList = document.getElementById('favoritesList');
  const remindersList = document.getElementById('remindersList');
  const reviewForm = document.getElementById('reviewForm');
  const reviewsList = document.getElementById('reviewsList');
  const usersList = document.getElementById('usersList');
  const trendsList = document.getElementById('trendsList');
  const errorDiv = document.getElementById('error');
  const successDiv = document.getElementById('success');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const usernameOrEmail = document.getElementById('usernameOrEmail').value;
      const password = document.getElementById('password').value;
      const rememberMe = document.getElementById('rememberMe').checked;

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernameOrEmail, password, rememberMe })
        });
        const data = await response.json();
        if (!response.ok) {
          errorDiv.classList.remove('d-none');
          errorDiv.innerText = data.error || 'Login failed';
        } else {
          localStorage.setItem('token', data.token);
          window.location.href = 'dashboard.html';
        }
      } catch (err) {
        errorDiv.classList.remove('d-none');
        errorDiv.innerText = 'Network error. Please try again.';
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (password !== confirmPassword) {
        errorDiv.classList.remove('d-none');
        errorDiv.innerText = 'Passwords do not match';
        return;
      }

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (!response.ok) {
          errorDiv.classList.remove('d-none');
          errorDiv.innerText = data.error || 'Signup failed';
          successDiv.classList.add('d-none');
        } else {
          successDiv.classList.remove('d-none');
          successDiv.innerText = data.message || 'Signup successful! Check email.';
          errorDiv.classList.add('d-none');
        }
      } catch (err) {
        errorDiv.classList.remove('d-none');
        errorDiv.innerText = 'Network error. Please try again.';
      }
    });
  }

  if (resetPasswordLink) {
    resetPasswordLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = prompt('Enter your email for reset:');
      if (!email) return;

      try {
        const response = await fetch('/api/auth/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (!response.ok) {
          alert(data.error || 'Reset failed');
        } else {
          alert(data.message || 'Reset link sent!');
        }
      } catch (err) {
        alert('Network error');
      }
    });
  }

  if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('books.html') || window.location.pathname.includes('profile.html') || window.location.pathname.includes('stats.html') || window.location.pathname.includes('reviews.html') || window.location.pathname.includes('admin.html')) {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    if (window.location.pathname.includes('books.html')) {
      fetch('/api/userbooks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(response => {
          if (!response.ok) throw new Error(`Failed to fetch books: ${response.status} ${response.statusText}`);
          return response.json();
        })
        .then(data => {
          if (data.error) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = data.error;
            return;
          }
          if (bookList) {
            if (data.length === 0) {
              bookList.innerHTML = '<p class="text-center">No books added yet.</p>';
            } else {
              bookList.innerHTML = data.map(book => `
                <div class="col-md-4 book-card">
                  <div class="card">
                    <div class="card-body">
                      ${book.CoverURL ? `<img src="${book.CoverURL}" alt="${book.Title} cover" class="img-fluid">` : ''}
                      <div>
                        <h5 class="card-title">${book.Title}</h5>
                        <p class="card-text">Author: ${book.Author}</p>
                        <p class="card-text">Status: ${book.ReadingStatus}</p>
                        <p class="card-text">Progress: ${book.Progress}%</p>
                        <p class="card-text">Owned: ${book.Owned ? 'Yes' : 'No'}</p>
                        <p class="card-text">DNF: ${book.DNF ? 'Yes' : 'No'}</p>
                        <button class="btn btn-secondary edit-book" data-id="${book.UserBookID}" aria-label="Edit book ${book.Title}">Edit</button>
                        <button class="btn btn-danger delete-book" data-id="${book.UserBookID}" aria-label="Delete book ${book.Title}">Delete</button>
                        <button class="btn btn-warning favorite-book" data-id="${book.BookID}" aria-label="Toggle favorite ${book.Title}">${book.isFavorite ? 'Unfavorite' : 'Favorite'}</button>
                        <button class="btn btn-info set-reminder" data-id="${book.BookID}" aria-label="Set reminder for ${book.Title}">Set Reminder</button>
                      </div>
                    </div>
                  </div>
                </div>
              `).join('');
            }
          }
        })
        .catch(err => {
          console.error('Fetch error:', err.message);
          if (errorDiv) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = `Failed to load books: ${err.message}`;
          }
        });
    }

    if (window.location.pathname.includes('dashboard.html')) {
      fetch('/api/userbooks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(response => {
          if (!response.ok) throw new Error(`Failed to fetch books: ${response.status} ${response.statusText}`);
          return response.json();
        })
        .then(data => {
          if (data.error) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = data.error;
            return;
          }
          if (bookList) {
            if (data.length === 0) {
              bookList.innerHTML = '<p class="text-center">No books added yet.</p>';
            } else {
              bookList.innerHTML = data.map(book => `
                <div class="col-md-4 book-preview">
                  <div class="card">
                    <div class="card-body">
                      ${book.CoverURL ? `<img src="${book.CoverURL}" alt="${book.Title} cover" class="img-fluid">` : ''}
                      <div>
                        <h5 class="card-title">${book.Title}</h5>
                        <p class="card-text">Author: ${book.Author}</p>
                        <p class="card-text">Status: ${book.ReadingStatus}</p>
                        <p class="card-text">Progress: ${book.Progress}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              `).join('');
            }
          }
        })
        .catch(err => {
          console.error('Fetch error:', err.message);
          if (errorDiv) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = `Failed to load books: ${err.message}`;
          }
        });
    }

    if (window.location.pathname.includes('profile.html')) {
      // Load profile info
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch user');
          return response.json();
        })
        .then(data => {
          if (profileForm) {
            document.getElementById('username').value = data.Username;
            document.getElementById('email').value = data.Email;
          }
        })
        .catch(err => {
          console.error('Error fetching user:', err.message);
          errorDiv.classList.remove('d-none');
          errorDiv.innerText = `Failed to load profile: ${err.message}`;
        });

      // Load favorites
      fetch('/api/favorites', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch favorites');
          return response.json();
        })
        .then(data => {
          if (favoritesList) {
            if (data.length === 0) {
              favoritesList.innerHTML = '<p class="text-center">No favorite books yet.</p>';
            } else {
              favoritesList.innerHTML = data.map(book => `
                <div class="col-md-4 book-card">
                  <div class="card">
                    <div class="card-body">
                      ${book.CoverURL ? `<img src="${book.CoverURL}" alt="${book.Title} cover" class="img-fluid">` : ''}
                      <div>
                        <h5 class="card-title">${book.Title}</h5>
                        <p class="card-text">Author: ${book.Author}</p>
                        <button class="btn btn-warning favorite-book" data-id="${book.BookID}" aria-label="Unfavorite ${book.Title}">Unfavorite</button>
                      </div>
                    </div>
                  </div>
                </div>
              `).join('');
            }
          }
        })
        .catch(err => {
          console.error('Error fetching favorites:', err.message);
          errorDiv.classList.remove('d-none');
          errorDiv.innerText = `Failed to load favorites: ${err.message}`;
        });

      // Load reminders
      fetch('/api/reminders', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch reminders');
          return response.json();
        })
        .then(data => {
          if (remindersList) {
            if (data.length === 0) {
              remindersList.innerHTML = '<p class="text-center">No reminders set.</p>';
            } else {
              remindersList.innerHTML = data.map(reminder => `
                <div class="col-md-4 book-card">
                  <div class="card">
                    <div class="card-body">
                      <h5 class="card-title">${reminder.Title}</h5>
                      <p class="card-text">Author: ${reminder.Author}</p>
                      <p class="card-text">Reminder Date: ${new Date(reminder.ReminderDate).toLocaleString()}</p>
                      <p class="card-text">Note: ${reminder.ReminderNote || 'None'}</p>
                      <button class="btn btn-danger delete-reminder" data-id="${reminder.ReminderID}" aria-label="Delete reminder for ${reminder.Title}">Delete</button>
                    </div>
                  </div>
                </div>
              `).join('');
            }
          }
        })
        .catch(err => {
          console.error('Error fetching reminders:', err.message);
          errorDiv.classList.remove('d-none');
          errorDiv.innerText = `Failed to load reminders: ${err.message}`;
        });
    }

    if (window.location.pathname.includes('stats.html')) {
      // Books read chart
      fetch('/api/stats/books-read', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch books read stats');
          return response.json();
        })
        .then(data => {
          const ctx = document.getElementById('booksReadChart').getContext('2d');
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: data.map(item => `${item.month}/${item.year}`),
              datasets: [{
                label: 'Books Read',
                data: data.map(item => item.count),
                backgroundColor: 'rgba(0, 123, 255, 0.5)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Books Read' } },
                x: { title: { display: true, text: 'Month/Year' } }
              }
            }
          });
        })
        .catch(err => {
          console.error('Error fetching books read stats:', err.message);
          errorDiv.classList.remove('d-none');
          errorDiv.innerText = `Failed to load stats: ${err.message}`;
        });

      // Mood distribution chart
      fetch('/api/stats/moods', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch mood stats');
          return response.json();
        })
        .then(data => {
          const ctx = document.getElementById('moodChart').getContext('2d');
          new Chart(ctx, {
            type: 'pie',
            data: {
              labels: data.map(item => item.Mood || 'Unknown'),
              datasets: [{
                label: 'Mood Distribution',
                data: data.map(item => item.count),
                backgroundColor: ['rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)', 'rgba(255, 206, 86, 0.5)'],
                borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)'],
                borderWidth: 1
              }]
            },
            options: {
              responsive: true
            }
          });
        })
        .catch(err => {
          console.error('Error fetching mood stats:', err.message);
          errorDiv.classList.remove('d-none');
          errorDiv.innerText = `Failed to load mood stats: ${err.message}`;
        });
    }

    if (window.location.pathname.includes('reviews.html')) {
      // Load reviews (example for bookId 1)
      fetch('/api/reviews/1', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch reviews');
          return response.json();
        })
        .then(data => {
          if (reviewsList) {
            if (data.length === 0) {
              reviewsList.innerHTML = '<p class="text-center">No reviews yet.</p>';
            } else {
              reviewsList.innerHTML = data.map(review => `
                <div class="col-md-6 mb-3">
                  <div class="card">
                    <div class="card-body">
                      <h5 class="card-title">${review.Username}</h5>
                      <p class="card-text">Rating: ${review.Rating ? review.Rating + '/5' : 'No rating'}</p>
                      <p class="card-text">${review.ReviewText || 'No review text'}</p>
                      <p class="card-text">Posted: ${new Date(review.DatePosted).toLocaleString()}</p>
                      <button class="btn btn-info view-comments" data-id="${review.ReviewID}" aria-label="View comments for ${review.Username}'s review">View Comments</button>
                    </div>
                  </div>
                </div>
              `).join('');
            }
          }
        })
        .catch(err => {
          console.error('Error fetching reviews:', err.message);
          errorDiv.classList.remove('d-none');
          errorDiv.innerText = `Failed to load reviews: ${err.message}`;
        });
    }

    if (window.location.pathname.includes('admin.html')) {
      // Load users
      fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch users');
          return response.json();
        })
        .then(data => {
          if (usersList) {
            usersList.innerHTML = data.map(user => `
              <tr>
                <td>${user.UserID}</td>
                <td>${user.Username}</td>
                <td>${user.Email}</td>
                <td>${user.Role}</td>
              </tr>
            `).join('');
          }
        })
        .catch(err => {
          console.error('Error fetching users:', err.message);
          errorDiv.classList.remove('d-none');
          errorDiv.innerText = `Failed to load users: ${err.message}`;
        });

      // Load trends
      fetch('/api/admin/trends', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch trends');
          return response.json();
        })
        .then(data => {
          if (trendsList) {
            trendsList.innerHTML = data.map(book => `
              <tr>
                <td>${book.BookID}</td>
                <td>${book.Title}</td>
                <td>${book.Author}</td>
                <td>${book.addCount}</td>
              </tr>
            `).join('');
          }
        })
        .catch(err => {
          console.error('Error fetching trends:', err.message);
          errorDiv.classList.remove('d-none');
          errorDiv.innerText = `Failed to load trends: ${err.message}`;
        });
    }

    if (addBookForm) {
      addBookForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const query = document.getElementById('bookQuery').value;
        const readingStatus = document.getElementById('readingStatus').value;
        const progress = parseInt(document.getElementById('progress').value);
        const owned = document.getElementById('owned').checked;
        const dnf = document.getElementById('dnf').checked;

        try {
          const response = await fetch('/api/books', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query, readingStatus, progress, owned, dnf })
          });
          const data = await response.json();
          if (!response.ok) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = data.error || 'Failed to add book';
            successDiv.classList.add('d-none');
          } else {
            successDiv.classList.remove('d-none');
            successDiv.innerText = 'Book added successfully!';
            errorDiv.classList.add('d-none');
            addBookForm.reset();
            window.location.reload();
          }
        } catch (err) {
          errorDiv.classList.remove('d-none');
          errorDiv.innerText = `Network error: ${err.message}`;
        }
      });
    }

    if (bookList && window.location.pathname.includes('books.html')) {
      bookList.addEventListener('click', async (e) => {
        const token = localStorage.getItem('token');
        if (e.target.classList.contains('edit-book')) {
          const id = e.target.dataset.id;
          const readingStatus = prompt('Enter new reading status (Read, Reading, To Read):');
          const progress = parseInt(prompt('Enter new progress (0-100):'));
          const owned = confirm('Is the book owned?');
          const dnf = confirm('Is the book DNF?');

          if (!['Read', 'Reading', 'To Read'].includes(readingStatus) || isNaN(progress) || progress < 0 || progress > 100) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = 'Invalid input';
            return;
          }

          try {
            const response = await fetch(`/api/userbooks/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ readingStatus, progress, owned, dnf })
            });
            const data = await response.json();
            if (!response.ok) {
              errorDiv.classList.remove('d-none');
              errorDiv.innerText = data.error || 'Failed to update book';
            } else {
              successDiv.classList.remove('d-none');
              successDiv.innerText = 'Book updated successfully!';
              errorDiv.classList.add('d-none');
              window.location.reload();
            }
          } catch (err) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = `Network error: ${err.message}`;
          }
        } else if (e.target.classList.contains('delete-book')) {
          const id = e.target.dataset.id;
          if (!confirm('Are you sure you want to delete this book?')) return;

          try {
            const response = await fetch(`/api/userbooks/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) {
              errorDiv.classList.remove('d-none');
              errorDiv.innerText = data.error || 'Failed to delete book';
            } else {
              successDiv.classList.remove('d-none');
              successDiv.innerText = 'Book deleted successfully!';
              errorDiv.classList.add('d-none');
              window.location.reload();
            }
          } catch (err) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = `Network error: ${err.message}`;
          }
        } else if (e.target.classList.contains('favorite-book')) {
          const bookId = e.target.dataset.id;
          const isFavorite = e.target.textContent === 'Unfavorite';
          try {
            const response = await fetch(`/api/favorites${isFavorite ? `/${bookId}` : ''}`, {
              method: isFavorite ? 'DELETE' : 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: isFavorite ? undefined : JSON.stringify({ bookId })
            });
            const data = await response.json();
            if (!response.ok) {
              errorDiv.classList.remove('d-none');
              errorDiv.innerText = data.error || `Failed to ${isFavorite ? 'remove' : 'add'} favorite`;
            } else {
              successDiv.classList.remove('d-none');
              successDiv.innerText = `Book ${isFavorite ? 'removed from' : 'added to'} favorites!`;
              errorDiv.classList.add('d-none');
              window.location.reload();
            }
          } catch (err) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = `Network error: ${err.message}`;
          }
        } else if (e.target.classList.contains('set-reminder')) {
          const bookId = e.target.dataset.id;
          const reminderDate = prompt('Enter reminder date (YYYY-MM-DD HH:MM:SS):');
          const reminderNote = prompt('Enter reminder note (optional, max 255 chars):');
          if (!reminderDate || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(reminderDate)) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = 'Invalid reminder date format';
            return;
          }

          try {
            const response = await fetch('/api/reminders', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ bookId, reminderDate, reminderNote })
            });
            const data = await response.json();
            if (!response.ok) {
              errorDiv.classList.remove('d-none');
              errorDiv.innerText = data.error || 'Failed to set reminder';
            } else {
              successDiv.classList.remove('d-none');
              successDiv.innerText = 'Reminder set successfully!';
              errorDiv.classList.add('d-none');
              window.location.reload();
            }
          } catch (err) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = `Network error: ${err.message}`;
          }
        }
      });
    }

    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;

        try {
          const response = await fetch('/api/auth/update', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username, email })
          });
          const data = await response.json();
          if (!response.ok) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = data.error || 'Failed to update profile';
          } else {
            successDiv.classList.remove('d-none');
            successDiv.innerText = 'Profile updated successfully!';
            errorDiv.classList.add('d-none');
          }
        } catch (err) {
          errorDiv.classList.remove('d-none');
          errorDiv.innerText = `Network error: ${err.message}`;
        }
      });
    }

    if (favoritesList) {
      favoritesList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('favorite-book')) {
          const token = localStorage.getItem('token');
          const bookId = e.target.dataset.id;

          try {
            const response = await fetch(`/api/favorites/${bookId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) {
              errorDiv.classList.remove('d-none');
              errorDiv.innerText = data.error || 'Failed to remove favorite';
            } else {
              successDiv.classList.remove('d-none');
              successDiv.innerText = 'Book removed from favorites!';
              errorDiv.classList.add('d-none');
              window.location.reload();
            }
          } catch (err) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = `Network error: ${err.message}`;
          }
        }
      });
    }

    if (remindersList) {
      remindersList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-reminder')) {
          const token = localStorage.getItem('token');
          const reminderId = e.target.dataset.id;

          try {
            const response = await fetch(`/api/reminders/${reminderId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) {
              errorDiv.classList.remove('d-none');
              errorDiv.innerText = data.error || 'Failed to delete reminder';
            } else {
              successDiv.classList.remove('d-none');
              successDiv.innerText = 'Reminder deleted successfully!';
              errorDiv.classList.add('d-none');
              window.location.reload();
            }
          } catch (err) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = `Network error: ${err.message}`;
          }
        }
      });
    }

    if (reviewForm) {
      reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const bookId = document.getElementById('bookId').value;
        const rating = document.getElementById('rating').value ? parseFloat(document.getElementById('rating').value) : null;
        const reviewText = document.getElementById('reviewText').value;

        try {
          const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ bookId, rating, reviewText })
          });
          const data = await response.json();
          if (!response.ok) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = data.error || 'Failed to post review';
            successDiv.classList.add('d-none');
          } else {
            successDiv.classList.remove('d-none');
            successDiv.innerText = 'Review posted successfully!';
            errorDiv.classList.add('d-none');
            reviewForm.reset();
            window.location.reload();
          }
        } catch (err) {
          errorDiv.classList.remove('d-none');
          errorDiv.innerText = `Network error: ${err.message}`;
        }
      });
    }

    if (reviewsList) {
      reviewsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('view-comments')) {
          const token = localStorage.getItem('token');
          const reviewId = e.target.dataset.id;

          try {
            const response = await fetch(`/api/reviews/${reviewId}/comments`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) {
              errorDiv.classList.remove('d-none');
              errorDiv.innerText = data.error || 'Failed to fetch comments';
            } else {
              const commentsHtml = data.length === 0 ? '<p>No comments yet.</p>' : data.map(comment => `
                <div class="card mb-2">
                  <div class="card-body">
                    <p class="card-text">${comment.Username}: ${comment.ProgressPercent ? `Progress: ${comment.ProgressPercent}%` : ''} ${comment.CommentText}</p>
                    <p class="card-text">Posted: ${new Date(comment.DatePosted).toLocaleString()}</p>
                  </div>
                </div>
              `).join('');
              e.target.parentElement.innerHTML += `
                <div class="mt-3">
                  <h6>Comments</h6>
                  ${commentsHtml}
                  <form class="comment-form" data-review-id="${reviewId}">
                    <div class="mb-3">
                      <label for="commentText-${reviewId}" class="form-label">Add Comment</label>
                      <textarea class="form-control" id="commentText-${reviewId}" rows="2"></textarea>
                    </div>
                    <div class="mb-3">
                      <label for="progressPercent-${reviewId}" class="form-label">Progress Percent (0-100)</label>
                      <input type="number" class="form-control" id="progressPercent-${reviewId}" min="0" max="100" value="0">
                    </div>
                    <button type="submit" class="btn btn-primary" aria-label="Post comment">Post Comment</button>
                  </form>
                </div>
              `;
            }
          } catch (err) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = `Network error: ${err.message}`;
          }
        }
      });

      reviewsList.addEventListener('submit', async (e) => {
        if (e.target.classList.contains('comment-form')) {
          e.preventDefault();
          const token = localStorage.getItem('token');
          const reviewId = e.target.dataset.reviewId;
          const commentText = document.getElementById(`commentText-${reviewId}`).value;
          const progressPercent = parseInt(document.getElementById(`progressPercent-${reviewId}`).value);

          try {
            const response = await fetch(`/api/reviews/${reviewId}/comments`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ commentText, progressPercent })
            });
            const data = await response.json();
            if (!response.ok) {
              errorDiv.classList.remove('d-none');
              errorDiv.innerText = data.error || 'Failed to post comment';
            } else {
              successDiv.classList.remove('d-none');
              successDiv.innerText = 'Comment posted successfully!';
              errorDiv.classList.add('d-none');
              window.location.reload();
            }
          } catch (err) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = `Network error: ${err.message}`;
          }
        }
      });
    }

    if (searchForm) {
      let currentPage = 1;
      const limit = 10;

      const performSearch = async () => {
        const token = localStorage.getItem('token');
        const query = document.getElementById('searchQuery').value;
        const mood = document.getElementById('moodFilter').value;
        const type = document.getElementById('typeFilter').value;
        const status = document.getElementById('statusFilter').value;

        const params = new URLSearchParams({ page: currentPage, limit });
        if (query) params.append('query', query);
        if (mood) params.append('mood', mood);
        if (type) params.append('type', type);
        if (status) params.append('status', status);

        try {
          const response = await fetch(`/api/books/search?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          if (!response.ok) {
            errorDiv.classList.remove('d-none');
            errorDiv.innerText = data.error || 'Search failed';
            return;
          }

          if (searchResults) {
            if (data.books.length === 0) {
              searchResults.innerHTML = '<p class="text-center">No books found.</p>';
            } else {
              searchResults.innerHTML = data.books.map(book => `
                <div class="col-md-4 book-card">
                  <div class="card">
                    <div class="card-body">
                      ${book.CoverURL ? `<img src="${book.CoverURL}" alt="${book.Title} cover" class="img-fluid">` : ''}
                      <div>
                        <h5 class="card-title">${book.Title}</h5>
                        <p class="card-text">Author: ${book.Author}</p>
                        ${book.ReadingStatus ? `<p class="card-text">Status: ${book.ReadingStatus}</p>` : ''}
                        ${book.Progress !== null ? `<p class="card-text">Progress: ${book.Progress}%</p>` : ''}
                        ${book.Owned ? `<p class="card-text">Owned: ${book.Owned ? 'Yes' : 'No'}</p>` : ''}
                        ${book.DNF ? `<p class="card-text">DNF: ${book.DNF ? 'Yes' : 'No'}</p>` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              `).join('');
            }

            prevPage.classList.toggle('disabled', data.page <= 1);
            nextPage.classList.toggle('disabled', data.page * data.limit >= data.total);
          }
        } catch (err) {
          errorDiv.classList.remove('d-none');
          errorDiv.innerText = `Search error: ${err.message}`;
        }
      };

      searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        currentPage = 1;
        await performSearch();
      });

      if (prevPage) {
        prevPage.addEventListener('click', async (e) => {
          e.preventDefault();
          if (currentPage > 1) {
            currentPage--;
            await performSearch();
          }
        });
      }

      if (nextPage) {
        nextPage.addEventListener('click', async (e) => {
          e.preventDefault();
          currentPage++;
          await performSearch();
        });
      }

      const searchQuery = document.getElementById('searchQuery');
      const autocompleteList = document.getElementById('autocompleteList');
      if (searchQuery && autocompleteList) {
        searchQuery.addEventListener('input', async () => {
          const query = searchQuery.value;
          if (query.length < 2) {
            autocompleteList.innerHTML = '';
            return;
          }

          try {
            const response = await fetch(`/api/books/autocomplete?query=${encodeURIComponent(query)}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) {
              autocompleteList.innerHTML = '';
              return;
            }

            autocompleteList.innerHTML = data.map(item => `
              <li class="list-group-item" data-query="${item.Title}">${item.Title} by ${item.Author}</li>
            `).join('');
          } catch (err) {
            console.error('Error fetching autocomplete:', err.message);
            autocompleteList.innerHTML = '';
          }
        });

        autocompleteList.addEventListener('click', (e) => {
          if (e.target.tagName === 'LI') {
            searchQuery.value = e.target.dataset.query;
            autocompleteList.innerHTML = '';
            searchForm.dispatchEvent(new Event('submit'));
          }
        });
      }
    }
}});