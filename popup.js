// Retrieve and populate saved settings when popup opens
document.addEventListener('DOMContentLoaded', () => {
  // Get scenario select dropdowns
  const scenarioSelects = document.querySelectorAll('.scenario-select');
  
  // Load scenarios and settings
  chrome.storage.local.get('scenarios', ({scenarios}) => {
    const scenarioNames = scenarios?.names || [];
    console.log('Loaded scenario names:', scenarioNames);
    
    // Only use default names if we don't have any stored scenarios
    const hasValidScenarios = scenarioNames.length === 3 && 
                            scenarioNames.some(name => name && name !== 'Scenario 1' && 
                                                           name !== 'Scenario 2' && 
                                                           name !== 'Scenario 3');
    
    // Populate dropdown options with proper fallback
    const options = Array(3).fill(null).map((_, index) => {
      const name = hasValidScenarios ? scenarioNames[index] : `Scenario ${index + 1}`;
      return `<option value="${index}">${name}</option>`;
    });
    
    scenarioSelects.forEach(select => select.innerHTML = options.join(''));

    // Load saved settings
    chrome.storage.sync.get({
      variance1: { minuend: 0, subtrahend: 1 },
      variance2: { minuend: 0, subtrahend: 2 },
      colorGradientEnabled: true,
      varianceThreshold: '',
      varianceHighlightEnabled: false
    }, (settings) => {
      document.getElementById('color-gradient-toggle').checked = settings.colorGradientEnabled;
      document.getElementById('variance1-minuend').value = settings.variance1.minuend;
      document.getElementById('variance1-subtrahend').value = settings.variance1.subtrahend;
      document.getElementById('variance2-minuend').value = settings.variance2.minuend;
      document.getElementById('variance2-subtrahend').value = settings.variance2.subtrahend;
      document.getElementById('variance-threshold').value = settings.varianceThreshold;
      
      const toggleBtn = document.getElementById('toggle-threshold');
      toggleBtn.textContent = settings.varianceHighlightEnabled ? 'Disable' : 'Enable';
      toggleBtn.classList.toggle('active', settings.varianceHighlightEnabled);
    });
  });
});

// Listen for scenario updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SCENARIOS_UPDATED') {
    chrome.storage.local.get('scenarios', ({scenarios}) => {
      const scenarioNames = scenarios.names;
      
      // Only update if we have valid scenario names
      if (scenarioNames && scenarioNames.length === 3 && 
          scenarioNames.some(name => name && name !== 'Scenario 1' && 
                                         name !== 'Scenario 2' && 
                                         name !== 'Scenario 3')) {
        console.log('Updating scenario dropdowns with:', scenarioNames);
        const options = scenarioNames.map((name, index) => 
          `<option value="${index}">${name}</option>`
        );
        document.querySelectorAll('.scenario-select').forEach(select => {
          select.innerHTML = options.join('');
        });
      }
    });
  }
});

// Compact view button handler
document.getElementById('compact-view-button').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {type: 'COMPACT_VIEW_CLICKED'});
    showStatus('Compact view applied!');
  });
});

// Color gradient toggle
document.getElementById('color-gradient-toggle').addEventListener('change', (e) => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'UPDATE_COLOR_GRADIENT',
      enabled: e.target.checked
    });
  });
});

// Variance threshold toggle
document.getElementById('toggle-threshold').addEventListener('click', () => {
  const threshold = document.getElementById('variance-threshold').value;
  if (!threshold) {
    document.getElementById('variance-threshold').style.borderColor = 'red';
    return;
  }

  chrome.storage.sync.get(['varianceHighlightEnabled'], (result) => {
    const newState = !result.varianceHighlightEnabled;
    
    chrome.storage.sync.set({
      varianceHighlightEnabled: newState,
      varianceThreshold: threshold
    }, () => {
      const toggleBtn = document.getElementById('toggle-threshold');
      toggleBtn.textContent = newState ? 'Disable' : 'Enable';
      toggleBtn.classList.toggle('active', newState);
      
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'TOGGLE_VARIANCE_HIGHLIGHT',
          enabled: newState,
          threshold: threshold
        });
      });
    });
  });
});

// Save settings handler
document.getElementById('save').addEventListener('click', () => {
  const settings = {
    variance1: {
      minuend: parseInt(document.getElementById('variance1-minuend').value),
      subtrahend: parseInt(document.getElementById('variance1-subtrahend').value)
    },
    variance2: {
      minuend: parseInt(document.getElementById('variance2-minuend').value),
      subtrahend: parseInt(document.getElementById('variance2-subtrahend').value)
    }
  };

  chrome.storage.sync.set({
    ...settings,
    colorGradientEnabled: document.getElementById('color-gradient-toggle').checked,
    varianceThreshold: document.getElementById('variance-threshold').value
  }, () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'UPDATE_VARIANCE_SETTINGS',
        settings: settings
      });
    });
    showStatus('Settings saved!');
  });
});

function showStatus(message) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.classList.add('success');
  status.style.display = 'block';
  setTimeout(() => status.style.display = 'none', 2000);
}
