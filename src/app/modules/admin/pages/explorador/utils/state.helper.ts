export class StateHelper {
  static createInitialModalState() {
    return {
      visible: false,
      type: null,
      title: '',
      message: '',
      data: null
    };
  }

  static createInitialUploadModalState() {
    return {
      visible: false,
      mode: null,
      title: ''
    };
  }

  static createInitialContextMenuState() {
    return {
      visible: false,
      x: 0,
      y: 0,
      node: null
    };
  }

  static createInitialToastState() {
    return {
      visible: false,
      message: '',
      type: 'success' as const
    };
  }
}