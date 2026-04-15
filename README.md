# CLOTO-NEW

Статический HTML/JS-проект для локального просмотра и публикации через GitHub.

## Продолжение работы в VS Code

Да, после публикации на GitHub вы продолжаете работать здесь же, в этом же проекте, через VS Code.
Обычный процесс такой:

1. Открываете папку проекта в VS Code.
2. Вносите изменения в HTML/JS-файлы.
3. Проверяете локально.
4. Делаете `git add`, `git commit`, `git push`.
5. GitHub обновляет удаленную версию проекта.

GitHub в этом случае нужен как удаленное хранилище и точка публикации, а не как замена вашей локальной работы.

## Локальный просмотр

Из папки проекта можно запустить один из вариантов:

### Вариант 1: через Node.js

```powershell
npm run serve
```

Сайт будет доступен по адресу:

```text
http://localhost:8080
```

### Вариант 2: через Python

```powershell
npm run serve:python
```

или напрямую:

```powershell
python -m http.server 8080
```

## Публикация на GitHub

1. Создайте пустой репозиторий на GitHub, например `CLOTO-NEW`.
2. Привяжите локальный проект к удаленному репозиторию:

```powershell
git remote add origin https://github.com/<username>/CLOTO-NEW.git
git branch -M main
git push -u origin main
```

3. На GitHub откройте `Settings -> Pages`.
4. В `Build and deployment` выберите:
   - `Source: Deploy from a branch`
   - `Branch: main`
   - `Folder: / (root)`
5. Сохраните настройки и дождитесь публикации.

После этого сайт обычно будет доступен по адресу вида:

```text
https://<username>.github.io/CLOTO-NEW/
```

## Первый коммит

Если репозиторий уже инициализирован локально, используйте:

```powershell
git add .
git commit -m "Initial project publish"
git push -u origin main
```