ssh -i ./files/key.pem ubuntu@18.142.3.23

rsync -avz -e "ssh -i ./files/key.pem" --exclude 'venv' --exclude '__pycache__' ./backend/ ubuntu@18.142.3.23:~/vitalvue/backend/