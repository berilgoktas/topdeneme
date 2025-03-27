import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getDatabase, ref, get } from 'firebase/database';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-box">
        <h2>Giriş Yap</h2>
        <div class="form-group">
          <label>Kullanıcı Adı:</label>
          <input type="text" [(ngModel)]="username" class="form-control">
        </div>
        <div class="form-group">
          <label>Şifre:</label>
          <input type="password" [(ngModel)]="password" class="form-control">
        </div>
        <button (click)="login()" class="btn btn-primary">Giriş</button>
        <p *ngIf="error" class="error-message">{{ error }}</p>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #f5f5f5;
    }
    .login-box {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      width: 100%;
      max-width: 400px;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
    }
    .form-control {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .error-message {
      color: red;
      margin-top: 1rem;
    }
    .btn {
      width: 100%;
      margin-top: 1rem;
    }
  `]
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  error: string = '';

  async login() {
    try {
      const db = getDatabase();
      const loginRef = ref(db, 'login');
      const snapshot = await get(loginRef);

      if (snapshot.exists()) {
        const users = snapshot.val();
        const user = Object.values(users).find((u: any) => 
          u.username === this.username && u.password === this.password
        );

        if (user) {
          // Başarılı giriş
          sessionStorage.setItem('isLoggedIn', 'true');
          window.location.reload();
        } else {
          this.error = 'Kullanıcı adı veya şifre hatalı!';
        }
      } else {
        this.error = 'Kullanıcı bulunamadı!';
      }
    } catch (error) {
      console.error('Giriş hatası:', error);
      this.error = 'Giriş yapılırken bir hata oluştu!';
    }
  }
} 