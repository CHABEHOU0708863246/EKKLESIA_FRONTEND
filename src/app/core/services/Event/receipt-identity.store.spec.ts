import {
  clearReceiptIdentity,
  loadReceiptIdentity,
  saveReceiptIdentity,
} from './receipt-identity.store';

describe('receipt-identity.store', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('enregistre puis relit une identité par email', () => {
    saveReceiptIdentity('attendee-1', { email: 'jean@test.com' });

    expect(loadReceiptIdentity('attendee-1')).toEqual({ email: 'jean@test.com', phone: undefined });
  });

  it('enregistre puis relit une identité par téléphone', () => {
    saveReceiptIdentity('attendee-2', { phone: '+225 07 00 00 00 00' });

    const identity = loadReceiptIdentity('attendee-2');
    expect(identity?.phone).toBe('+225 07 00 00 00 00');
    expect(identity?.email).toBeUndefined();
  });

  it("ignore l'identité d'un autre participant", () => {
    saveReceiptIdentity('attendee-3', { email: 'jean@test.com' });

    expect(loadReceiptIdentity('attendee-autre')).toBeNull();
  });

  it('retourne null sans identité enregistrée', () => {
    expect(loadReceiptIdentity('inconnu')).toBeNull();
  });

  it('ne mémorise rien si ni email ni téléphone', () => {
    saveReceiptIdentity('attendee-4', {});

    expect(loadReceiptIdentity('attendee-4')).toBeNull();
  });

  it('efface l’identité enregistrée', () => {
    saveReceiptIdentity('attendee-5', { email: 'jean@test.com' });
    clearReceiptIdentity();

    expect(loadReceiptIdentity('attendee-5')).toBeNull();
  });
});
