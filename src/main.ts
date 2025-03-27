import { Component, OnInit } from '@angular/core';  // Angular component'i oluşturmak için gerekli import
import { CommonModule } from '@angular/common';      // NgIf, NgFor gibi temel direktifler için gerekli import
import { FormsModule } from '@angular/forms';         // Angular'ın formları için gerekli modül
import { bootstrapApplication } from '@angular/platform-browser'; // Angular uygulamasını başlatmak için gerekli modül
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, push, remove, update, get } from 'firebase/database';
import { environment } from './environments/environment';
import { LoginComponent } from './app/login.component';

// Firebase başlatma
const app = initializeApp(environment.firebase);
const database = getDatabase(app);

// Default admin kullanıcısını oluştur
async function createDefaultAdmin() {
  try {
    const loginRef = ref(database, 'login');
    const snapshot = await get(loginRef);
    
    if (!snapshot.exists()) {
      await set(loginRef, {
        admin: {
          username: 'admin',
          password: '123'
        }
      });
      console.log('Default admin kullanıcısı oluşturuldu');
    }
  } catch (error) {
    console.error('Default admin oluşturulurken hata:', error);
  }
}

// Default admin'i oluştur
createDefaultAdmin();

interface Participant {         //arayüz tanımlamaları
  id: number;
  name: string;
  time: number;
  tempTime?: number;  // Geçici süre değeri için
  isRunning: boolean;
  isLate: boolean;
  shouldAttend: boolean;
  notes: string[];
}

interface MeetingHistory {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  totalTime: number;
  participants: Participant[];
  isEditing?: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, LoginComponent],
  templateUrl: './app/app.component.html'
}) 
export class App implements OnInit {
  participants: Participant[] = [
    { id: 1, name: 'AKSİYON TAKİBİ', time: 0, isRunning: false, isLate: false, shouldAttend: false, notes: [] },
    { id: 2, name: 'İSG & İNSAN KAYNAKLARI', time: 0, isRunning: false, isLate: false, shouldAttend: false, notes: [] },
    { id: 3, name: 'KALİTE & ÇEVRE', time: 0, isRunning: false, isLate: false, shouldAttend: false, notes: [] },
    { id: 4, name: 'SATIŞ & PAZARLAMA', time: 0, isRunning: false, isLate: false, shouldAttend: false, notes: [] },
    { id: 5, name: 'BAKIM & ONARIM', time: 0, isRunning: false, isLate: false, shouldAttend: false, notes: [] },
    { id: 6, name: 'PLANLAMA', time: 0, isRunning: false, isLate: false, shouldAttend: false, notes: [] },
    { id: 7, name: 'SATIN ALMA', time: 0, isRunning: false, isLate: false, shouldAttend: false, notes: [] },
    { id: 8, name: 'TALAŞLI İMALAT', time: 0, isRunning: false, isLate: false, shouldAttend: false, notes: [] },
    { id: 9, name: 'ENJEKSİYON', time: 0, isRunning: false, isLate: false, shouldAttend: false, notes: [] },
    { id: 10, name: 'SEVKİYAT & LOJİSTİK', time: 0, isRunning: false, isLate: false, shouldAttend: false, notes: [] },
    { id: 11, name: 'YALIN ÜRETİM', time: 0, isRunning: false, isLate: false, shouldAttend: false, notes: [] },
    { id: 12, name: 'TASARIM MERKEZİ', time: 0, isRunning: false, isLate: false, shouldAttend: false, notes: [] }
  ];

  isMeetingRunning: boolean = false;
  totalMeetingTime: number = 0;
  participantNotes: { [key: number]: string } = {};
  showHistory: boolean = false;
  meetingHistory: MeetingHistory[] = [];
  private timer: any;
  editingMeetingId: string | null = null;

  // Modal properties
  showModal = false;
  modalTitle = '';
  modalMessage = '';
  modalConfirmText = '';
  modalConfirmButtonClass = '';
  modalCallback: (() => void) | null = null;

  isLoggedIn: boolean = false;

  async ngOnInit() {
    // Login kontrolü
    this.isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    
    if (this.isLoggedIn) {
      // Mevcut ngOnInit içeriği
      await this.loadMeetingHistory();
      this.participants.forEach(p => {
        this.participantNotes[p.id] = '';
      });
    const savedView = localStorage.getItem('viewState');
    if (savedView) {
      this.showHistory = JSON.parse(savedView);
    }
    }
  }

  public saveData() {
    localStorage.setItem('meetingData', JSON.stringify({
      participants: this.participants,
      totalMeetingTime: this.totalMeetingTime
    }));
  }

  private async loadMeetingHistory() {
    try {
      console.log('Toplantı geçmişi yükleniyor...');
      const toplantiGecmisiRef = ref(database, 'toplantiGecmisi');
      
      // Gerçek zamanlı güncelleme için onValue kullanıyoruz
      onValue(toplantiGecmisiRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log('Firebase\'den alınan ham veriler:', data);

          // Veriyi diziye çevir
          let meetings: MeetingHistory[] = [];
          
          if (typeof data === 'object' && !Array.isArray(data)) {
            // Eğer veri obje formatında ise (key-value pairs)
            meetings = Object.entries(data).map(([key, value]: [string, any]) => {
              // Katılımcıları düzgün formata getir
              let participants = [];
              if (value.participants && typeof value.participants === 'object') {
                if (Array.isArray(value.participants)) {
                  participants = value.participants;
                } else {
                  participants = Object.values(value.participants);
                }
              }

              return {
                id: value.id || key,
                date: value.date,
                startTime: value.startTime,
                endTime: value.endTime,
                totalTime: value.totalTime || 0,
                participants: participants.map((p: Participant) => ({
                  id: p.id,
                  name: p.name,
                  time: p.time || 0,
                  isRunning: p.isRunning || false,
                  isLate: p.isLate || false,
                  shouldAttend: p.shouldAttend || false,
                  notes: p.notes || []
                })),
                isEditing: false
              };
            });
          } else if (Array.isArray(data)) {
            // Eğer veri zaten dizi formatında ise
            meetings = data.map(meeting => ({
              ...meeting,
              participants: meeting.participants.map((p: Participant) => ({
                ...p,
                time: p.time || 0,
                isRunning: p.isRunning || false,
                isLate: p.isLate || false,
                shouldAttend: p.shouldAttend || false,
                notes: p.notes || []
              })),
              isEditing: false
            }));
          }

          // Tarihe göre sırala (en yeni en üstte)
          meetings.sort((a, b) => {
            const dateA = new Date(`${a.date} ${a.startTime}`);
            const dateB = new Date(`${b.date} ${b.startTime}`);
            return dateB.getTime() - dateA.getTime();
          });

          this.meetingHistory = meetings;
          console.log('İşlenmiş toplantı geçmişi:', this.meetingHistory);
        } else {
          console.log('Toplantı geçmişi bulunamadı');
          this.meetingHistory = [];
        }
      }, (error) => {
        console.error('Veri okuma hatası:', error);
        this.meetingHistory = [];
      });

    } catch (error) {
      console.error('Toplantı geçmişi yüklenirken hata:', error);
      this.meetingHistory = [];
    }
  }

  private async saveMeetingHistory() {
    try {
      console.log('Toplantı geçmişi kaydediliyor...');
      const toplantiGecmisiRef = ref(database, 'toplantiGecmisi');
      
      // isEditing özelliğini kaldır ve Firebase'e kaydet
      const cleanHistory = this.meetingHistory.map(meeting => {
        const { isEditing, ...cleanMeeting } = meeting;
        return {
          ...cleanMeeting,
          participants: cleanMeeting.participants.map(p => ({
            id: p.id,
            name: p.name,
            time: p.time || 0,
            isRunning: p.isRunning || false,
            isLate: p.isLate || false,
            shouldAttend: p.shouldAttend || false,
            notes: p.notes || []
          }))
        };
      });

      await set(toplantiGecmisiRef, cleanHistory);
      console.log('Toplantı geçmişi başarıyla kaydedildi:', cleanHistory);
    } catch (error) {
      console.error('Toplantı geçmişi kaydedilirken hata:', error);
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  toggleMeeting() {
    this.isMeetingRunning = !this.isMeetingRunning;
    if (this.isMeetingRunning) {
      this.timer = setInterval(() => {
        this.totalMeetingTime++;
        this.participants.forEach(p => {
          if (p.isRunning) {
            p.time++;
          }
        });
        this.saveData();
      }, 1000);
    } else {
      clearInterval(this.timer);
    }
  }

  showEndMeetingModal() {
    this.modalTitle = 'Toplantıyı Bitir';
    this.modalMessage = 'Toplantıyı bitirmek istediğinizden emin misiniz?';
    this.modalConfirmText = 'Bitir';
    this.modalConfirmButtonClass = 'btn-danger';
    this.modalCallback = async () => {
      this.isMeetingRunning = false;
      clearInterval(this.timer);

      const now = new Date();
      const startTime = new Date(now.getTime() - (this.totalMeetingTime * 1000));

      const meetingRecord: MeetingHistory = {
        id: Date.now().toString(),
        date: this.formatDateOnly(startTime),
        startTime: this.formatTimeOnly(startTime),
        endTime: this.formatTimeOnly(now),
        totalTime: this.totalMeetingTime,
        participants: JSON.parse(JSON.stringify(this.participants))
      };

      try {
        // Yeni toplantıyı geçmiş listesine ekle
      this.meetingHistory.unshift(meetingRecord);
        
        // Tüm geçmişi Firebase'e kaydet
        await this.saveMeetingHistory();
        console.log('Toplantı başarıyla kaydedildi:', meetingRecord);

      // Toplantıyı sıfırla
        this.resetMeeting();

      // Sayfanın en üstüne git
      window.scrollTo(0, 0);
      } catch (error) {
        console.error('Toplantı kaydedilirken hata:', error);
        // Hata durumunda eklenen toplantıyı geri al
        this.meetingHistory.shift();
      }
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.modalCallback = null;
  }

  confirmModal() {
    if (this.modalCallback) {
      this.modalCallback();
    }
    this.closeModal();
  }

  toggleParticipant(participant: Participant) {
    if (this.isMeetingRunning) {
      // Stop other participants
      this.participants.forEach(p => {
        if (p.id !== participant.id) {
          p.isRunning = false;
        }
      });
      // Toggle selected participant
      participant.isRunning = !participant.isRunning;
      this.saveData();
    }
  }

  addNote(participant: Participant) {
    const note = this.participantNotes[participant.id].trim();
    if (note) {
      participant.notes.push(note);
      this.participantNotes[participant.id] = '';
      this.saveData();
    }
  }

  deleteNote(participant: Participant, index: number) {
    participant.notes.splice(index, 1);
    this.saveData();
  }

  async deleteMeeting(meeting: MeetingHistory) {
    try {
      const toplantiRef = ref(database, `toplantiGecmisi/${meeting.id}`);
      await remove(toplantiRef);
      
      // Yerel listeyi güncelle
    const index = this.meetingHistory.findIndex(m => m.id === meeting.id);
    if (index !== -1) {
        this.meetingHistory.splice(index, 1);
      }
    } catch (error) {
      console.error('Toplantı silinirken hata:', error);
    }
  }

  async updateTime(event: Event, unit: 'minutes' | 'seconds', participant: Participant, meeting: MeetingHistory) {
    try {
    const input = event.target as HTMLInputElement;
    let value = Math.floor(Number(input.value));
    
    // Değer kontrolü
    if (isNaN(value) || value < 0) {
      value = 0;
    } else if (value > 59) {
      value = 59;
    }
    
    // Input değerini güncelle ve imleci sonunda tut
    const cursorPos = input.selectionStart;
    input.value = value.toString();
    input.setSelectionRange(cursorPos, cursorPos);
    
    // Zamanı güncelle
    const currentUnits = this.getTimeUnits(participant.time);
    if (unit === 'minutes') {
      participant.time = value * 60 + currentUnits.seconds;
    } else {
      participant.time = currentUnits.minutes * 60 + value;
    }
    
      // Toplantının toplam süresini güncelle
      meeting.totalTime = meeting.participants.reduce((total, p) => total + p.time, 0);
      
      // Firebase'de doğrudan bu toplantıyı güncelle
      const toplantiRef = ref(database, `toplantiGecmisi/${meeting.id}`);
      const { isEditing, ...cleanMeeting } = meeting;
      await update(toplantiRef, cleanMeeting);

      // Yerel state'i güncelle
      const index = this.meetingHistory.findIndex(m => m.id === meeting.id);
      if (index !== -1) {
        this.meetingHistory[index] = { ...meeting };
      }

      console.log('Süre başarıyla güncellendi:', {
        participantName: participant.name,
        newTime: participant.time,
        meetingTotal: meeting.totalTime
      });
    } catch (error) {
      console.error('Süre güncellenirken hata oluştu:', error);
    }
  }

  async handleStatusChange(event: Event, participant: Participant, status: 'late' | 'absent', meeting: MeetingHistory) {
    try {
    const checkbox = event.target as HTMLInputElement;
    
    if (status === 'late') {
      participant.isLate = checkbox.checked;
      if (checkbox.checked) {
        participant.shouldAttend = false;
      }
    } else if (status === 'absent') {
      participant.shouldAttend = checkbox.checked;
      if (checkbox.checked) {
        participant.isLate = false;
      }
    }
    
      // Firebase'de doğrudan bu toplantıyı güncelle
      const toplantiRef = ref(database, `toplantiGecmisi/${meeting.id}`);
      const { isEditing, ...cleanMeeting } = meeting;
      await update(toplantiRef, cleanMeeting);

      // Yerel state'i güncelle
      const index = this.meetingHistory.findIndex(m => m.id === meeting.id);
      if (index !== -1) {
        this.meetingHistory[index] = { ...meeting };
      }

      console.log('Katılımcı durumu güncellendi:', {
        participantName: participant.name,
        status: status,
        isLate: participant.isLate,
        shouldAttend: participant.shouldAttend
      });
    } catch (error) {
      console.error('Katılımcı durumu güncellenirken hata:', error);
    }
  }

  formatDateOnly(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    };
    return new Date(date).toLocaleDateString('tr-TR', options);
  }

  formatTimeOnly(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    return new Date(date).toLocaleTimeString('tr-TR', options);
  }

  private saveViewState() {
    localStorage.setItem('viewState', JSON.stringify(this.showHistory));
  }

  toggleHistory() {
    this.showHistory = !this.showHistory;
    this.saveViewState();
  }

  showResetMeetingModal() {
    this.modalTitle = 'Toplantıyı Sıfırla';
    this.modalMessage = 'Toplantıyı sıfırlamak istediğinizden emin misiniz?';
    this.modalConfirmText = 'Sıfırla';
    this.modalConfirmButtonClass = 'btn-warning';
    this.modalCallback = () => {
      this.isMeetingRunning = false;
      clearInterval(this.timer);
      this.totalMeetingTime = 0;
      this.participants.forEach(p => {
        p.time = 0;
        p.isRunning = false;
        p.isLate = false;
        p.shouldAttend = false;
        p.notes = [];
        this.participantNotes[p.id] = '';
      });
      this.saveData();
    };
    this.showModal = true;
  }

  async toggleEditMeeting(meeting: MeetingHistory) {
    if (meeting.isEditing) {
      // Düzenleme modundan çıkarken değişiklikleri kaydet
      meeting.isEditing = false;
      this.editingMeetingId = null;

      // Tüm katılımcıların geçici sürelerini kalıcı hale getir
      meeting.participants.forEach(participant => {
        if (participant.tempTime !== undefined) {
          participant.time = participant.tempTime;
        }
      });

      // Toplam süreyi güncelle
      meeting.totalTime = meeting.participants.reduce((total, p) => total + (p.time || 0), 0);

      // Firebase'e kaydet
      await this.saveMeetingHistory();
    } else {
      // Diğer toplantıların düzenleme modunu kapat
      this.meetingHistory.forEach(m => {
        if (m.id !== meeting.id) {
          m.isEditing = false;
        }
      });

      // Her katılımcı için geçici süre değerini ayarla
      meeting.participants.forEach(participant => {
        participant.tempTime = participant.time;
      });

      meeting.isEditing = true;
      this.editingMeetingId = meeting.id;
    }
  }

  private resetMeeting() {
    this.isMeetingRunning = false;
    clearInterval(this.timer);
    this.totalMeetingTime = 0;
    this.participants.forEach(p => {
      p.time = 0;
      p.isRunning = false;
      p.isLate = false;
      p.shouldAttend = false;
      p.notes = [];
      this.participantNotes[p.id] = '';
    });
  }

  getTimeUnits(totalSeconds: number) {
    return {
      minutes: Math.floor(totalSeconds / 60),
      seconds: totalSeconds % 60
    };
  }

  updateParticipantStatus(participant: Participant, status: 'late' | 'absent' | null) {
    try {
      if (status === 'late') {
        participant.shouldAttend = false;
        participant.isLate = true;
      } else if (status === 'absent') {
        participant.isLate = false;
        participant.shouldAttend = true;
      } else {
        participant.isLate = false;
        participant.shouldAttend = false;
      }
      console.log('Katılımcı durumu güncellendi:', {
        participantName: participant.name,
        isLate: participant.isLate,
        shouldAttend: participant.shouldAttend
      });
    } catch (error) {
      console.error('Katılımcı durumu güncellenirken hata:', error);
    }
  }

  resetParticipantTime(participant: Participant) {
    try {
      participant.time = 0;
      participant.isRunning = false;
      console.log('Katılımcı süresi sıfırlandı:', participant.name);
    } catch (error) {
      console.error('Katılımcı süresi sıfırlanırken hata:', error);
    }
  }

  handleTimeInput(event: Event, participant: Participant) {
    const validatedTime = this.validateTimeInput(event);
    participant.tempTime = validatedTime;
  }

  async saveParticipantTime(participant: Participant, meeting: MeetingHistory, newTime: number) {
    try {
      // Yeni süreyi güncelle (undefined kontrolü ile)
      participant.time = newTime || 0;
      participant.tempTime = newTime || 0;

      // Toplantının toplam süresini güncelle
      const totalTime = meeting.participants.reduce((total, p) => total + (p.time || 0), 0);
      meeting.totalTime = totalTime;
      
      // Firebase'de güncelleme yap
      const toplantiRef = ref(database, `toplantiGecmisi/${meeting.id}`);
      const { isEditing, ...cleanMeeting } = meeting;
      
      try {
        await update(toplantiRef, cleanMeeting);
        console.log('Katılımcı süresi başarıyla güncellendi:', {
          participantId: participant.id,
          participantName: participant.name,
          newTime: newTime,
          meetingTotal: totalTime
        });
      } catch (error) {
        console.error('Firebase güncelleme hatası:', error);
        // Hata durumunda eski değere geri dön
        participant.time = participant.tempTime || 0;
        throw error;
      }
    } catch (error) {
      console.error('Süre güncellenirken hata:', error);
    }
  }

  validateTimeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = Math.floor(Number(input.value));
    
    // Değer kontrolü
    if (isNaN(value) || value < 0) {
      value = 0;
    } else if (value > 59) {
      value = 59;
    }
    
    // Input değerini güncelle
    input.value = value.toString();
    return value;
  }

  showDeleteMeetingModal(meeting: MeetingHistory) {
    this.modalTitle = 'Toplantıyı Sil';
    this.modalMessage = 'Bu toplantıyı silmek istediğinizden emin misiniz?';
    this.modalConfirmText = 'Sil';
    this.modalConfirmButtonClass = 'btn-danger';
    this.modalCallback = async () => {
      try {
        // Firebase'den sil
        const toplantiRef = ref(database, `toplantiGecmisi/${meeting.id}`);
        await remove(toplantiRef);
        
        // Yerel listeden sil
        const index = this.meetingHistory.findIndex(m => m.id === meeting.id);
        if (index !== -1) {
          this.meetingHistory.splice(index, 1);
        }
        
        // Tüm listeyi Firebase'e kaydet
        await this.saveMeetingHistory();
        
        console.log('Toplantı başarıyla silindi:', meeting);
      } catch (error) {
        console.error('Toplantı silinirken hata:', error);
      }
    };
    this.showModal = true;
  }

  logout() {
    sessionStorage.removeItem('isLoggedIn');
    window.location.reload();
  }
}

bootstrapApplication(App);