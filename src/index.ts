import { h, render } from 'preact';
import Popup from './popup';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app');
  if (root) {
    render(h(Popup, {}), root);
  }
});