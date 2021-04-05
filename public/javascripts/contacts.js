"use strict";

// eslint-disable-next-line max-lines-per-function
document.addEventListener('DOMContentLoaded', () => {
  class UIManager {
    constructor() {
      this.templates = {};
      this.contactsControl = document.getElementById('contacts-control');
      this.emptyContactsMsg = document.getElementById("empty-contacts-msg");
      this.emptyFilterMsg = document.getElementById("empty-filter-msg");
      this.main = document.querySelector('main');
      this.contactsList = document.getElementById('contacts');
      this.contactForm = document.getElementById('contact-form');
      this.tagsField = document.getElementById('tags-field');
      this.tagForm = document.getElementById('tag-form');
      this.contactCancelBtn = document.getElementById('contact-cancel');
      this.tagCancelBtn = document.getElementById('tag-cancel');
      this.search = document.getElementById('search');
      this.showAll = document.getElementById('show-contacts-btn');
      this.assignTemplates();
      this.registerHelpers();
    }

    assignTemplates() {
      document.querySelectorAll('[type="text/x-handlebars"]')
        .forEach(template => {
          this.templates[template.id] = Handlebars.compile(template.innerHTML);
        });
    }

    registerHelpers() {
      Handlebars.registerHelper('print_tag_name', function() {
        return this;
      });
    }

    hideAllMain() {
      [...this.main.children].forEach(elem => elem.classList.add('hide'));
    }

    showDefaultDisplay() {
      this.hideAllMain();
      this.contactsControl.classList.remove('hide');
      if (this.isEmptyContacts()) {
        this.emptyContactsMsg.classList.remove('hide');
      } else {
        this.contactsList.classList.remove('hide');
      }
    }

    isEmptyContacts() {
      return this.contactsList.lastElementChild.tagName !== 'DIV';
    }

    clearContacts() {
      this.contactsList.querySelectorAll('.contact')
        .forEach(elem => elem.remove());
    }

    clearTags() {
      this.tagsField.querySelectorAll('[name="tags"]')
        .forEach(tag => {
          tag.nextElementSibling.remove();
          tag.remove();
        });
    }

    renderContacts(contacts, isFilter = false) {
      if (contacts.length > 0 || isFilter) {
        this.clearContacts();
        this.emptyContactsMsg.classList.add('hide');
        this.contactsList.classList.remove('hide');

        contacts.forEach(contact => {
          this.contactsList.insertAdjacentHTML('beforeend',
            this.templates['contactTemplate'](contact));
        });
      } else if (!isFilter) {
        this.emptyContactsMsg.classList.remove('hide');
        this.contactsList.classList.add('hide');
      }
    }

    renderTags(tags) {
      this.clearTags();
      this.tagsField.querySelector('div')
        .insertAdjacentHTML('beforebegin',
          this.templates['tagTemplate']({ tags }));

      if (this.contactForm.dataset.id) {
        const contact = this.contactsList
          .querySelector(`[data-id="${this.contactForm.dataset.id}"]`);
        this.contactForm.tags.forEach(tag => {
          if (contact.dataset.tags.includes(tag.value)) tag.checked = true;
        });
      }
    }

    showNewContactForm() {
      this.hideAllMain();
      this.contactForm.parentNode.querySelector('h2')
        .textContent = 'Create Contact';
      this.contactForm.parentNode.classList.remove('hide');
      this.contactForm.setAttribute('data-id', '');
      this.contactForm.setAttribute('data-type', 'create');
    }

    showEditContactForm(contact) {
      this.hideAllMain();
      this.contactForm.parentNode.querySelector('h2')
        .textContent = 'Edit Contact';
      this.contactForm.parentNode.classList.remove('hide');
      this.contactForm.setAttribute('data-type', 'edit');
      this.populateEditContactForm(contact);
    }

    populateEditContactForm(contact) {
      this.contactForm.dataset.id = contact.dataset.id;
      this.contactForm.full_name.value = contact.dataset.name;
      this.contactForm.email.value = contact.dataset.email;
      this.contactForm.phone_number.value = contact.dataset.phone;
      this.contactForm.tags.forEach(tag => {
        if (contact.dataset.tags.includes(tag.value)) tag.checked = true;
      });
    }

    showTagForm() {
      this.hideAllMain();
      this.tagForm.parentNode.classList.remove('hide');
    }

    showEmptyFilterMsg(filteredLength) {
      if (filteredLength === 0) {
        this.emptyFilterMsg.classList.remove('hide');
        this.emptyFilterMsg.querySelector('span')
          .textContent = this.search.value;
      } else {
        this.emptyFilterMsg.classList.add('hide');
      }
    }

    resetForm(form) {
      form.reset();

      if (form.id === 'contact-form') {
        this.showDefaultDisplay();
      } else if (form.id === 'tag-form') {
        form.parentNode.classList.add('hide');
        this.contactForm.parentNode.classList.remove('hide');
      }
    }

    isConfirmedDelete() {
      return confirm('Are you sure you want to delete this contact?');
    }
  }

  class ContactsManager {
    constructor() {
      this.contacts = [];
      this.tags = [];
    }

    setContacts(contacts) {
      this.contacts = contacts;
    }

    getContact(id) {
      return this.contacts.find(contact => contact.id === id);
    }

    getContacts() {
      return this.contacts.slice();
    }

    getTags() {
      return this.tags.slice();
    }

    processTags(tags) {
      tags.forEach(tag => {
        if (!this.tags.includes(tag)) this.tags.push(tag);
      });
    }

    filterBySearch(letters) {
      letters = letters.trim().toLowerCase();
      return this.contacts.filter(contact => {
        return contact.full_name.toLowerCase().includes(letters);
      });
    }

    filterByTag(tag) {
      return this.contacts.filter(contact => {
        return contact.tags.includes(tag);
      });
    }

    deleteContact(id) {
      const contact = this.contacts.find(contact => contact['id'] === id);
      this.contacts.splice(this.contacts.indexOf(contact), 1);
    }

    saveContact(newContact) {
      this.contacts.push(newContact);
      this.processTags(newContact.tags);
    }

    updateContact(contact) {
      let index = this.contacts
        .indexOf(this.getContact(parseInt(contact.id, 10)));
      this.contacts[index] = contact;
      this.processTags(contact.tags);
    }
  }

  class API {
    constructor(ContactsManager) {
      this.ContactsManager = ContactsManager;
    }

    deleteContact(id) {
      this.ContactsManager.deleteContact(id);
      fetch(`/api/contacts/${id}`, { method: 'DELETE'});
    }

    saveContact(data) {
      return fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(data)
      })
        .then(response => response.json())
        .then(json => {
          json.tags = json.tags ? json.tags.split(',') : [];
          this.ContactsManager.saveContact(json);
        });
    }

    updateContact(data) {
      return fetch(`/api/contacts/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(data)
      })
        .then(response => response.json())
        .then(json => {
          json.tags = json.tags ? json.tags.split(',') : [];
          this.ContactsManager.updateContact(json);
        });
    }

    requestContacts() {
      return fetch('/api/contacts')
        .then(response => response.json())
        .then(json => {
          json.forEach(contact => {
            contact.tags = contact.tags ? contact.tags.split(',') : [];
            this.ContactsManager.processTags(contact.tags);
          });

          this.ContactsManager.setContacts(json);
        });
    }
  }

  class Form {
    serializeContactData(form) {
      const data = new FormData(form);
      const json = {};

      for (let entry of data) {
        let key = entry[0];
        let val = entry[1];

        if (json[key]) {
          json[key] += `,${val}`;
        } else {
          json[key] = val;
        }
      }

      if (form.dataset.id) json.id = form.dataset.id;
      if (!json.tags) json.tags = null;

      return json;
    }

    retrieveNewTag(form) {
      return form.new_tag.value;
    }
  }

  class EventsManager {
    constructor() {
      this.UIManager = new UIManager();
      this.ContactsManager = new ContactsManager();
      this.API = new API(this.ContactsManager);
      this.Form = new Form();
      this.bindEvents();
    }

    buttonClick(event) {
      const button = event.target;
      if (button.classList.contains('add-contact-btn')) {
        this.UIManager.showNewContactForm(this.ContactsManager.contacts);
      } else if (button.classList.contains('delete-btn')) {
        if (this.UIManager.isConfirmedDelete()) {
          const id = parseInt(button.closest('.contact').dataset.id, 10);
          this.API.deleteContact(id);
          this.UIManager.renderContacts(this.ContactsManager.getContacts());
        }
      } else if (button.classList.contains('add-tag-btn')) {
        this.UIManager.showTagForm();
      } else if (button.classList.contains('edit-btn')) {
        this.UIManager.showEditContactForm(button.closest('.contact'));
      }
    }

    linkClick(event) {
      if (event.target.classList.contains('tag')) {
        let filtered = this.ContactsManager
          .filterByTag(event.target.textContent);
        this.UIManager.renderContacts(filtered, true);
      }
    }

    click(event) {
      switch (event.target.tagName) {
        case 'BUTTON':
          this.buttonClick(event);
          break;
        case 'A':
          this.linkClick(event);
          break;
      }
    }

    cancelCreate(event) {
      this.UIManager.resetForm(event.target.closest('form'));
    }

    async processContact(event) {
      event.preventDefault();
      const data = this.Form.serializeContactData(this.UIManager.contactForm);
      const formType = this.UIManager.contactForm.dataset.type;

      if (formType === 'create') {
        await this.API.saveContact(data);
      } else if (formType === 'edit') {
        await this.API.updateContact(data);
      }

      this.UIManager.resetForm(event.target);
      this.UIManager.renderContacts(this.ContactsManager.getContacts());
    }

    createTag(event) {
      event.preventDefault();
      const newTag = this.Form.retrieveNewTag(event.target);
      this.ContactsManager.processTags([newTag]);
      this.UIManager.resetForm(event.target);
      this.UIManager.renderTags(this.ContactsManager.getTags());
    }

    search(event) {
      if (event.key.length === 1 || event.key === 'Backspace' ||
          event.key === 'Enter') {
        let filtered = this.ContactsManager
          .filterBySearch(event.target.value);
        this.UIManager.renderContacts(filtered, true);
        this.UIManager.showEmptyFilterMsg(filtered.length);
      }
    }

    showAllContacts(_) {
      this.UIManager.renderContacts(this.ContactsManager.getContacts());
    }

    bindEvents() {
      this.UIManager.main
        .addEventListener('click', this.click.bind(this));
      this.UIManager.contactCancelBtn.addEventListener('click',
        this.cancelCreate.bind(this));
      this.UIManager.tagCancelBtn.addEventListener('click',
        this.cancelCreate.bind(this));
      this.UIManager.showAll
        .addEventListener('click', this.showAllContacts.bind(this));
      this.UIManager.search
        .addEventListener('keyup', this.search.bind(this));
      this.UIManager.contactForm
        .addEventListener('submit', this.processContact.bind(this));
      this.UIManager.tagForm
        .addEventListener('submit', this.createTag.bind(this));
    }
  }

  class App {
    async init() {
      this.EventsManager = new EventsManager();
      this.ContactsManager = this.EventsManager.ContactsManager;
      this.UIManager = this.EventsManager.UIManager;
      this.API = this.EventsManager.API;
      await this.API.requestContacts();
      this.UIManager.renderContacts(this.ContactsManager.getContacts());
      this.UIManager.renderTags(this.ContactsManager.getTags());
    }
  }

  const app = new App();
  app.init();
});