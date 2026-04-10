import yaml
import os

def load_config(config_file):
    with open(config_file, encoding='utf-8') as f:
        config = yaml.safe_load(f)

    return config


class Cfg(dict):
    def __init__(self, config_dict):
        super(Cfg, self).__init__(**config_dict)
        self.__dict__ = self

    @staticmethod
    def load_config_from_file(fname, base_file='Vocr/config/base.yml'):
        # --- FIX ĐƯỜNG DẪN TUYỆT ĐỐI ---
        # Lấy đường dẫn thư mục chứa file config.py hiện tại (Vocr/tool)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Lùi lại 1 cấp để ra thư mục Vocr, sau đó vào thư mục config tìm base.yml
        vocr_dir = os.path.dirname(current_dir)
        absolute_base_file = os.path.join(vocr_dir, 'config', 'base.yml')
        # -------------------------------

        # Nạp base_config bằng đường dẫn tuyệt đối
        base_config = load_config(absolute_base_file)

        with open(fname, encoding='utf-8') as f:
            config = yaml.safe_load(f)
        base_config.update(config)

        return Cfg(base_config)

    def save(self, fname):
        with open(fname, 'w') as outfile:
            yaml.dump(dict(self), outfile, default_flow_style=False, allow_unicode=True)